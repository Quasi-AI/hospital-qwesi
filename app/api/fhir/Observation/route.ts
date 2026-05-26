/**
 * FHIR R4 Observation Endpoint
 * 
 * POST /api/fhir/Observation
 * 
 * Receives FHIR Observation resources and converts them to DeviceResult records.
 * Observations can be sent individually or as part of a collection.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '../../../../lib/mongodb';
import LabDevice from '../../../../models/LabDevice';
import DeviceResult from '../../../../models/DeviceResult';
import LabTest from '../../../../models/LabTest';
import { FHIRObservation } from '../../../../lib/fhir/types';
import {
  processObservation,
  validateObservation,
  createSuccessOutcome,
  createErrorOutcome,
  extractReferenceId,
  extractReferenceDisplay,
} from '../../../../lib/fhir/mapper';

// FHIR content type
const FHIR_JSON_TYPE = 'application/fhir+json';

/**
 * POST - Receive an Observation
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Get API key from header
    const apiKey = request.headers.get('X-Device-API-Key') || 
                   request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!apiKey) {
      const outcome = createErrorOutcome(
        'Missing API key. Include X-Device-API-Key header or Authorization: Bearer token.',
        'security',
        'error'
      );
      return NextResponse.json(outcome, {
        status: 401,
        headers: { 'Content-Type': FHIR_JSON_TYPE },
      });
    }
    
    // Hash the provided API key to find the device
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const device = await LabDevice.findOne({ apiKeyHash, isActive: true });
    
    if (!device) {
      const outcome = createErrorOutcome(
        'Invalid API key or device is inactive',
        'security',
        'error'
      );
      return NextResponse.json(outcome, {
        status: 401,
        headers: { 'Content-Type': FHIR_JSON_TYPE },
      });
    }
    
    // Parse the request body
    const body = await request.json();
    
    // Validate it's an Observation
    if (body.resourceType !== 'Observation') {
      const outcome = createErrorOutcome(
        `Expected Observation, received ${body.resourceType || 'unknown'}`,
        'invalid'
      );
      return NextResponse.json(outcome, {
        status: 400,
        headers: { 'Content-Type': FHIR_JSON_TYPE },
      });
    }
    
    const observation = body as FHIRObservation;
    
    // Validate the observation
    const validation = validateObservation(observation);
    if (!validation.valid) {
      const outcome = createErrorOutcome(
        `Invalid Observation: ${validation.errors.join('; ')}`,
        'invalid'
      );
      return NextResponse.json(outcome, {
        status: 400,
        headers: { 'Content-Type': FHIR_JSON_TYPE },
      });
    }
    
    // Process the observation
    const extractedObs = processObservation(observation);
    
    // Get patient and specimen info
    const patientId = extractReferenceId(observation.subject);
    const patientName = extractReferenceDisplay(observation.subject);
    const specimenId = extractReferenceId(observation.specimen) || 
                       observation.id || 
                       `FHIR-OBS-${Date.now()}`;
    
    // Map result using device parameter mappings
    const mapping = device.parameterMappings?.find(
      (m: any) => m.deviceCode?.toUpperCase() === extractedObs.code?.toUpperCase()
    );
    
    const unit = extractedObs.units || mapping?.unit || '';
    const normalRange = extractedObs.referenceRange || mapping?.normalRange || '';
    
    // Map flag
    let flag = extractedObs.abnormalFlag;
    
    const mappedResult = {
      parameterCode: extractedObs.code,
      parameterName: mapping?.testName || extractedObs.name || extractedObs.code,
      value: extractedObs.value,
      unit,
      normalRange,
      flag,
      rawValue: extractedObs.value,
    };
    
    // Try to auto-match with existing lab test
    let matchedLabTestId: string | undefined;
    let matchedTestNumber: string | undefined;
    let matchStatus: 'matched' | 'unmatched' | 'multiple' | 'manual' = 'unmatched';
    let matchConfidence = 0;
    let possibleMatches: any[] = [];
    
    if (specimenId) {
      const labTests = await LabTest.find({
        $or: [
          { testNumber: specimenId },
          { testNumber: { $regex: specimenId, $options: 'i' } },
        ],
        status: { $in: ['pending', 'sample-collected', 'in-progress'] },
      }).limit(5).lean();
      
      if (labTests.length === 1) {
        matchedLabTestId = (labTests[0] as any)._id.toString();
        matchedTestNumber = (labTests[0] as any).testNumber;
        matchStatus = 'matched';
        matchConfidence = 100;
      } else if (labTests.length > 1) {
        matchStatus = 'multiple';
        matchConfidence = 70;
        possibleMatches = labTests.map((lt: any) => ({
          labTestId: lt._id.toString(),
          testNumber: lt.testNumber,
          patientName: lt.patientName,
          testType: lt.testType,
          confidence: lt.testNumber === specimenId ? 100 : 70,
        }));
      }
    }
    
    // Create DeviceResult record
    const deviceResult = new DeviceResult({
      deviceId: device._id,
      deviceCode: device.deviceCode,
      deviceName: device.name,
      receivedAt: new Date(),
      analyzedAt: extractedObs.effectiveDateTime,
      sampleId: specimenId,
      patientId,
      patientName,
      matchedLabTestId,
      matchedTestNumber,
      matchStatus,
      matchConfidence,
      possibleMatches,
      results: [mappedResult],
      rawPayload: JSON.stringify({
        protocol: 'FHIR',
        resourceType: 'Observation',
        observationId: observation.id,
        body,
      }),
    });
    
    await deviceResult.save();
    
    // Update device stats
    device.lastSeenAt = new Date();
    device.lastResultAt = new Date();
    device.connectionStatus = 'online';
    device.totalResultsReceived = (device.totalResultsReceived || 0) + 1;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastReset = new Date(device.lastResetDate || 0);
    lastReset.setHours(0, 0, 0, 0);
    if (today > lastReset) {
      device.resultsToday = 1;
      device.lastResetDate = new Date();
    } else {
      device.resultsToday = (device.resultsToday || 0) + 1;
    }
    
    await device.save();
    
    // Return success outcome
    const outcome = createSuccessOutcome(
      `Observation processed successfully. Result number: ${deviceResult.resultNumber}`
    );
    
    return NextResponse.json(outcome, {
      status: 201,
      headers: {
        'Content-Type': FHIR_JSON_TYPE,
        'X-Result-Number': deviceResult.resultNumber,
      },
    });
    
  } catch (error: any) {
    console.error('Error processing FHIR Observation:', error);
    const outcome = createErrorOutcome(
      error.message || 'Failed to process Observation',
      'exception',
      'error'
    );
    return NextResponse.json(outcome, {
      status: 500,
      headers: { 'Content-Type': FHIR_JSON_TYPE },
    });
  }
}

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Device-API-Key',
      'Access-Control-Max-Age': '86400',
    },
  });
}
