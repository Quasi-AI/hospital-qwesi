/**
 * FHIR R4 DiagnosticReport Endpoint
 * 
 * POST /api/fhir/DiagnosticReport
 * 
 * Receives FHIR DiagnosticReport resources and converts them to DeviceResult records.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '../../../../lib/mongodb';
import LabDevice from '../../../../models/LabDevice';
import DeviceResult from '../../../../models/DeviceResult';
import LabTest from '../../../../models/LabTest';
import {
  FHIRDiagnosticReport,
  FHIRObservation,
  FHIROperationOutcome,
} from '../../../../lib/fhir/types';
import {
  processDiagnosticReport,
  validateDiagnosticReport,
  convertToDeviceResultInput,
  createSuccessOutcome,
  createErrorOutcome,
  extractReferenceId,
} from '../../../../lib/fhir/mapper';

// FHIR content type
const FHIR_JSON_TYPE = 'application/fhir+json';

/**
 * POST - Receive a DiagnosticReport
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
    
    // Validate it's a DiagnosticReport
    if (body.resourceType !== 'DiagnosticReport') {
      const outcome = createErrorOutcome(
        `Expected DiagnosticReport, received ${body.resourceType || 'unknown'}`,
        'invalid'
      );
      return NextResponse.json(outcome, {
        status: 400,
        headers: { 'Content-Type': FHIR_JSON_TYPE },
      });
    }
    
    const report = body as FHIRDiagnosticReport;
    
    // Validate the report
    const validation = validateDiagnosticReport(report);
    if (!validation.valid) {
      const outcome = createErrorOutcome(
        `Invalid DiagnosticReport: ${validation.errors.join('; ')}`,
        'invalid'
      );
      return NextResponse.json(outcome, {
        status: 400,
        headers: { 'Content-Type': FHIR_JSON_TYPE },
      });
    }
    
    // Extract contained observations if present
    const observations: FHIRObservation[] = [];
    if (body.contained && Array.isArray(body.contained)) {
      for (const contained of body.contained) {
        if (contained.resourceType === 'Observation') {
          observations.push(contained as FHIRObservation);
        }
      }
    }
    
    // Process the DiagnosticReport
    const extractedResult = processDiagnosticReport(report, observations);
    
    // Convert to DeviceResult input
    const input = convertToDeviceResultInput(extractedResult, JSON.stringify(body));
    
    // Map results using device parameter mappings
    const mappedResults = input.results.map(r => {
      const mapping = device.parameterMappings?.find(
        (m: any) => m.deviceCode?.toUpperCase() === r.code?.toUpperCase()
      );
      
      const unit = r.unit || mapping?.unit || '';
      const normalRange = r.referenceRange || mapping?.normalRange || '';
      
      // Map flag
      let flag: 'normal' | 'low' | 'high' | 'critical-low' | 'critical-high' = 'normal';
      if (r.flag) {
        const deviceFlag = r.flag.toUpperCase();
        if (deviceFlag === 'L') flag = 'low';
        else if (deviceFlag === 'H') flag = 'high';
        else if (deviceFlag === 'LL' || deviceFlag === 'CL') flag = 'critical-low';
        else if (deviceFlag === 'HH' || deviceFlag === 'CH') flag = 'critical-high';
      }
      
      return {
        parameterCode: r.code,
        parameterName: mapping?.testName || r.code,
        value: r.value,
        unit,
        normalRange,
        flag,
        rawValue: r.value,
      };
    });
    
    // Try to auto-match with existing lab test
    let matchedLabTestId: string | undefined;
    let matchedTestNumber: string | undefined;
    let matchStatus: 'matched' | 'unmatched' | 'multiple' | 'manual' = 'unmatched';
    let matchConfidence = 0;
    let possibleMatches: any[] = [];
    
    if (input.sampleId) {
      const labTests = await LabTest.find({
        $or: [
          { testNumber: input.sampleId },
          { testNumber: { $regex: input.sampleId, $options: 'i' } },
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
          confidence: lt.testNumber === input.sampleId ? 100 : 70,
        }));
      }
    }
    
    // Create DeviceResult record
    const deviceResult = new DeviceResult({
      deviceId: device._id,
      deviceCode: device.deviceCode,
      deviceName: device.name,
      receivedAt: new Date(),
      analyzedAt: input.analyzedAt,
      sampleId: input.sampleId || report.id || `FHIR-${Date.now()}`,
      patientId: input.patientId,
      patientName: input.patientName,
      matchedLabTestId,
      matchedTestNumber,
      matchStatus,
      matchConfidence,
      possibleMatches,
      results: mappedResults,
      rawPayload: JSON.stringify({
        protocol: 'FHIR',
        resourceType: 'DiagnosticReport',
        reportId: report.id,
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
      `DiagnosticReport processed successfully. Result number: ${deviceResult.resultNumber}`
    );
    
    return NextResponse.json(outcome, {
      status: 201,
      headers: {
        'Content-Type': FHIR_JSON_TYPE,
        'X-Result-Number': deviceResult.resultNumber,
      },
    });
    
  } catch (error: any) {
    console.error('Error processing FHIR DiagnosticReport:', error);
    const outcome = createErrorOutcome(
      error.message || 'Failed to process DiagnosticReport',
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
