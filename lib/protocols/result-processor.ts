/**
 * Unified Result Processor
 * 
 * Common processing logic for all protocol types (HL7, ASTM, FHIR, REST)
 * Creates DeviceResult records and handles auto-matching.
 */

import mongoose from 'mongoose';

// Protocol types
export type ProtocolType = 'HL7' | 'ASTM' | 'FHIR' | 'REST';

// Common input format for all protocols
export interface ProtocolResultInput {
  // Protocol information
  protocol: ProtocolType;
  protocolVersion?: string;
  
  // Device identification
  deviceIdentifier: string;
  deviceId?: string;
  
  // Sample/Specimen identification
  sampleId: string;
  
  // Patient information
  patientId?: string;
  patientName?: string;
  dateOfBirth?: Date;
  sex?: string;
  
  // Timing
  analyzedAt?: Date;
  receivedAt?: Date;
  
  // Results
  results: ProtocolResultItem[];
  
  // Raw data for audit
  rawPayload: string;
}

export interface ProtocolResultItem {
  code: string;
  name?: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  flag?: 'normal' | 'low' | 'high' | 'critical-low' | 'critical-high';
  rawFlag?: string;
}

// Processing result
export interface ProcessingResult {
  success: boolean;
  resultNumber?: string;
  deviceResultId?: string;
  matchStatus: 'matched' | 'unmatched' | 'multiple' | 'manual';
  matchedTestNumber?: string;
  hasCriticalValues: boolean;
  errors: string[];
}

/**
 * Process results from any protocol
 */
export async function processResults(
  input: ProtocolResultInput
): Promise<ProcessingResult> {
  const errors: string[] = [];
  
  try {
    // Import models dynamically to avoid circular dependencies
    const LabDevice = mongoose.models.LabDevice || 
      (await import('../../models/LabDevice')).default;
    const DeviceResult = mongoose.models.DeviceResult || 
      (await import('../../models/DeviceResult')).default;
    const LabTest = mongoose.models.LabTest || 
      (await import('../../models/LabTest')).default;
    
    // Find or create device reference
    let device = null;
    if (input.deviceId) {
      device = await LabDevice.findById(input.deviceId);
    }
    if (!device && input.deviceIdentifier) {
      device = await LabDevice.findOne({
        $or: [
          { deviceCode: input.deviceIdentifier.toUpperCase() },
          { name: { $regex: input.deviceIdentifier, $options: 'i' } },
        ],
        isActive: true,
      });
    }
    
    // Map results using device parameter mappings if available
    const mappedResults = input.results.map(r => {
      const mapping = device?.parameterMappings?.find(
        (m: any) => m.deviceCode?.toUpperCase() === r.code?.toUpperCase()
      );
      
      const unit = r.unit || mapping?.unit || '';
      const normalRange = r.referenceRange || mapping?.normalRange || '';
      
      // Determine flag
      let flag = r.flag || 'normal';
      if (r.rawFlag && !r.flag) {
        flag = mapRawFlag(r.rawFlag);
      }
      
      // Check against critical thresholds if no flag provided
      if (flag === 'normal' && mapping?.criticalLow && mapping?.criticalHigh) {
        const numValue = parseFloat(r.value);
        if (!isNaN(numValue)) {
          if (numValue <= parseFloat(mapping.criticalLow)) {
            flag = 'critical-low';
          } else if (numValue >= parseFloat(mapping.criticalHigh)) {
            flag = 'critical-high';
          }
        }
      }
      
      return {
        parameterCode: r.code,
        parameterName: mapping?.testName || r.name || r.code,
        value: r.value,
        unit,
        normalRange,
        flag,
        rawValue: r.value,
      };
    });
    
    // Auto-match with existing lab test
    let matchedLabTestId: string | undefined;
    let matchedTestNumber: string | undefined;
    let matchStatus: 'matched' | 'unmatched' | 'multiple' | 'manual' = 'unmatched';
    let matchConfidence = 0;
    let possibleMatches: any[] = [];
    
    if (input.sampleId) {
      const labTests = await LabTest.find({
        $or: [
          { testNumber: input.sampleId },
          { testNumber: { $regex: `^${escapeRegex(input.sampleId)}$`, $options: 'i' } },
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
          confidence: lt.testNumber.toUpperCase() === input.sampleId.toUpperCase() ? 100 : 70,
        }));
      }
    }
    
    // Create DeviceResult record
    const deviceResult = new DeviceResult({
      deviceId: device?._id || `${input.protocol}_${input.deviceIdentifier}`,
      deviceCode: device?.deviceCode || input.deviceIdentifier,
      deviceName: device?.name || `${input.protocol} Device (${input.deviceIdentifier})`,
      receivedAt: input.receivedAt || new Date(),
      analyzedAt: input.analyzedAt,
      sampleId: input.sampleId,
      patientId: input.patientId,
      patientName: input.patientName,
      matchedLabTestId,
      matchedTestNumber,
      matchStatus,
      matchConfidence,
      possibleMatches,
      results: mappedResults,
      rawPayload: input.rawPayload,
    });
    
    await deviceResult.save();
    
    // Update device stats if we found a device
    if (device) {
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
    }
    
    return {
      success: true,
      resultNumber: deviceResult.resultNumber,
      deviceResultId: deviceResult._id.toString(),
      matchStatus,
      matchedTestNumber,
      hasCriticalValues: deviceResult.hasCriticalValues,
      errors: [],
    };
    
  } catch (error: any) {
    console.error('Error processing results:', error);
    errors.push(error.message || 'Unknown error');
    
    return {
      success: false,
      matchStatus: 'unmatched',
      hasCriticalValues: false,
      errors,
    };
  }
}

/**
 * Map raw flag string to internal format
 */
function mapRawFlag(rawFlag: string): 'normal' | 'low' | 'high' | 'critical-low' | 'critical-high' {
  const flag = (rawFlag || '').toUpperCase().trim();
  
  switch (flag) {
    case 'L':
    case 'LOW':
    case '<':
      return 'low';
    case 'H':
    case 'HIGH':
    case '>':
      return 'high';
    case 'LL':
    case 'CL':
    case 'CRITICAL-LOW':
    case '<<':
      return 'critical-low';
    case 'HH':
    case 'CH':
    case 'CRITICAL-HIGH':
    case '>>':
      return 'critical-high';
    case 'N':
    case 'NORMAL':
    case '':
    default:
      return 'normal';
  }
}

/**
 * Escape special regex characters
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Batch process multiple result sets
 */
export async function processResultsBatch(
  inputs: ProtocolResultInput[]
): Promise<ProcessingResult[]> {
  const results: ProcessingResult[] = [];
  
  for (const input of inputs) {
    const result = await processResults(input);
    results.push(result);
  }
  
  return results;
}

/**
 * Get protocol statistics
 */
export async function getProtocolStats(): Promise<{
  protocols: { protocol: string; count: number; lastReceived: Date | null }[];
  totalToday: number;
  criticalPending: number;
}> {
  const DeviceResult = mongoose.models.DeviceResult || 
    (await import('../../models/DeviceResult')).default;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get counts by protocol
  const pipeline = [
    {
      $addFields: {
        parsedPayload: {
          $cond: {
            if: { $regexMatch: { input: '$rawPayload', regex: /^{/ } },
            then: { $function: {
              body: function(str: string) { try { return JSON.parse(str); } catch { return {}; } },
              args: ['$rawPayload'],
              lang: 'js'
            }},
            else: {}
          }
        }
      }
    },
    {
      $group: {
        _id: '$parsedPayload.protocol',
        count: { $sum: 1 },
        lastReceived: { $max: '$receivedAt' },
      }
    }
  ];
  
  // Fallback: just get totals
  const totalToday = await DeviceResult.countDocuments({
    receivedAt: { $gte: today },
  });
  
  const criticalPending = await DeviceResult.countDocuments({
    status: 'pending',
    hasCriticalValues: true,
  });
  
  return {
    protocols: [], // Would need aggregation
    totalToday,
    criticalPending,
  };
}
