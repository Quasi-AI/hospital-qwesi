/**
 * FHIR R4 Bundle Endpoint
 * 
 * POST /api/fhir/Bundle
 * 
 * Receives FHIR Bundle resources containing DiagnosticReports and Observations.
 * Supports transaction and batch bundles for sending multiple results at once.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '../../../../lib/mongodb';
import LabDevice from '../../../../models/LabDevice';
import DeviceResult from '../../../../models/DeviceResult';
import LabTest from '../../../../models/LabTest';
import { FHIRBundle, FHIRBundleEntry } from '../../../../lib/fhir/types';
import {
  processBundle,
  validateBundle,
  convertToDeviceResultInput,
  createSuccessOutcome,
  createErrorOutcome,
} from '../../../../lib/fhir/mapper';

// FHIR content type
const FHIR_JSON_TYPE = 'application/fhir+json';

/**
 * POST - Receive a Bundle (transaction or batch)
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
    
    // Validate it's a Bundle
    if (body.resourceType !== 'Bundle') {
      const outcome = createErrorOutcome(
        `Expected Bundle, received ${body.resourceType || 'unknown'}`,
        'invalid'
      );
      return NextResponse.json(outcome, {
        status: 400,
        headers: { 'Content-Type': FHIR_JSON_TYPE },
      });
    }
    
    const bundle = body as FHIRBundle;
    
    // Validate the bundle
    const validation = validateBundle(bundle);
    if (!validation.valid) {
      const outcome = createErrorOutcome(
        `Invalid Bundle: ${validation.errors.join('; ')}`,
        'invalid'
      );
      return NextResponse.json(outcome, {
        status: 400,
        headers: { 'Content-Type': FHIR_JSON_TYPE },
      });
    }
    
    // Process the bundle
    const extractedResults = processBundle(bundle);
    
    if (extractedResults.length === 0) {
      const outcome = createErrorOutcome(
        'Bundle contains no processable DiagnosticReports or Observations',
        'not-found',
        'warning'
      );
      return NextResponse.json(outcome, {
        status: 400,
        headers: { 'Content-Type': FHIR_JSON_TYPE },
      });
    }
    
    // Process each extracted result
    const responseEntries: FHIRBundleEntry[] = [];
    let processedCount = 0;
    let errorCount = 0;
    
    for (const extractedResult of extractedResults) {
      try {
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
          sampleId: input.sampleId || `FHIR-BUNDLE-${Date.now()}-${processedCount}`,
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
            resourceType: 'Bundle',
            bundleType: bundle.type,
            bundleId: bundle.id,
          }),
        });
        
        await deviceResult.save();
        
        // Add success entry to response
        responseEntries.push({
          response: {
            status: '201 Created',
            location: `DeviceResult/${deviceResult._id}`,
          },
        });
        
        processedCount++;
      } catch (error: any) {
        console.error('Error processing bundle entry:', error);
        
        // Add error entry to response
        responseEntries.push({
          response: {
            status: '500 Internal Server Error',
            outcome: createErrorOutcome(error.message, 'exception'),
          },
        });
        
        errorCount++;
      }
    }
    
    // Update device stats
    if (processedCount > 0) {
      device.lastSeenAt = new Date();
      device.lastResultAt = new Date();
      device.connectionStatus = 'online';
      device.totalResultsReceived = (device.totalResultsReceived || 0) + processedCount;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastReset = new Date(device.lastResetDate || 0);
      lastReset.setHours(0, 0, 0, 0);
      if (today > lastReset) {
        device.resultsToday = processedCount;
        device.lastResetDate = new Date();
      } else {
        device.resultsToday = (device.resultsToday || 0) + processedCount;
      }
      
      await device.save();
    }
    
    // Build response bundle
    const responseBundle: FHIRBundle = {
      resourceType: 'Bundle',
      type: bundle.type === 'transaction' ? 'transaction-response' : 'batch-response',
      entry: responseEntries,
    };
    
    // Determine overall status
    let status = 200;
    if (errorCount > 0 && processedCount === 0) {
      status = 500;
    } else if (errorCount > 0) {
      status = 207; // Multi-status
    } else if (processedCount > 0) {
      status = 200;
    }
    
    return NextResponse.json(responseBundle, {
      status,
      headers: {
        'Content-Type': FHIR_JSON_TYPE,
        'X-Processed-Count': processedCount.toString(),
        'X-Error-Count': errorCount.toString(),
      },
    });
    
  } catch (error: any) {
    console.error('Error processing FHIR Bundle:', error);
    const outcome = createErrorOutcome(
      error.message || 'Failed to process Bundle',
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
