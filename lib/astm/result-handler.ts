/**
 * ASTM Result Handler
 * 
 * Processes ASTM messages and extracts results for storage
 */

import {
  ASTMMessage,
  HeaderRecord,
  PatientRecord,
  OrderRecord,
  ResultRecord,
  parseASTMDateTime,
  mapASTMAbnormalFlag,
} from './parser';

// Extracted result from ASTM message
export interface ASTMExtractedResult {
  // Patient Information
  patientId: string;
  patientName: string;
  dateOfBirth: Date | null;
  sex: string;
  
  // Specimen/Order Information
  specimenId: string;
  instrumentSpecimenId: string;
  testCode: string;
  testName: string;
  specimenCollectionDateTime: Date | null;
  dateTimeReported: Date | null;
  
  // Results
  observations: ASTMObservation[];
  
  // Source Information
  senderNameOrId: string;
  receiverId: string;
  messageDateTime: Date | null;
}

export interface ASTMObservation {
  code: string;
  name: string;
  value: string;
  units: string;
  referenceRange: string;
  abnormalFlag: 'normal' | 'low' | 'high' | 'critical-low' | 'critical-high';
  resultStatus: string;
  dateTimeCompleted: Date | null;
  instrumentId: string;
}

/**
 * Process an ASTM message and extract all results
 */
export function processASTMMessage(message: ASTMMessage): ASTMExtractedResult[] {
  const results: ASTMExtractedResult[] = [];
  
  for (const patientData of message.patients) {
    const patient = patientData.patient;
    
    for (const orderData of patientData.orders) {
      const order = orderData.order;
      
      if (orderData.results.length > 0) {
        results.push(buildExtractedResult(
          message.header,
          patient,
          order,
          orderData.results
        ));
      }
    }
  }
  
  return results;
}

/**
 * Build an extracted result from ASTM records
 */
function buildExtractedResult(
  header: HeaderRecord,
  patient: PatientRecord,
  order: OrderRecord,
  results: ResultRecord[]
): ASTMExtractedResult {
  // Parse patient name (may be in format LAST^FIRST^MIDDLE)
  const nameParts = patient.patientName.split('^');
  const patientName = nameParts.length > 1
    ? `${nameParts[0]}, ${nameParts[1]}`
    : patient.patientName;
  
  // Parse test ID from order (may be in format code^name^system)
  const testParts = order.universalTestId.split('^');
  
  // Build observations from result records
  const observations: ASTMObservation[] = results.map(result => ({
    code: result.testIdCode || result.universalTestId.split('^')[0] || '',
    name: result.testIdName || result.universalTestId.split('^')[1] || result.testIdCode || '',
    value: result.dataOrMeasurementValue,
    units: result.units,
    referenceRange: result.referenceRange,
    abnormalFlag: mapASTMAbnormalFlag(result.abnormalFlags),
    resultStatus: result.resultStatus,
    dateTimeCompleted: parseASTMDateTime(result.dateTimeTestCompleted),
    instrumentId: result.instrumentId,
  }));
  
  return {
    // Patient Information
    patientId: patient.patientIdInternal || patient.patientId || '',
    patientName,
    dateOfBirth: parseASTMDateTime(patient.birthDate),
    sex: patient.sex,
    
    // Specimen/Order Information
    specimenId: order.specimenId || order.instrumentSpecimenId || '',
    instrumentSpecimenId: order.instrumentSpecimenId || '',
    testCode: testParts[0] || '',
    testName: testParts[1] || testParts[0] || '',
    specimenCollectionDateTime: parseASTMDateTime(order.specimenCollectionDateTime),
    dateTimeReported: parseASTMDateTime(order.dateTimeReported),
    
    // Results
    observations,
    
    // Source Information
    senderNameOrId: header.senderNameOrId,
    receiverId: header.receiverId,
    messageDateTime: parseASTMDateTime(header.dateTime),
  };
}

/**
 * Convert ASTM results to the format expected by DeviceResult model
 */
export interface DeviceResultInput {
  sampleId: string;
  patientId?: string;
  patientName?: string;
  analyzedAt?: Date;
  results: {
    code: string;
    value: string;
    unit?: string;
    flag?: string;
  }[];
  rawPayload: string;
}

export function convertToDeviceResultInput(
  astmResult: ASTMExtractedResult,
  rawMessage: string
): DeviceResultInput {
  return {
    sampleId: astmResult.specimenId || astmResult.instrumentSpecimenId,
    patientId: astmResult.patientId,
    patientName: astmResult.patientName,
    analyzedAt: astmResult.dateTimeReported || astmResult.specimenCollectionDateTime || undefined,
    results: astmResult.observations.map(obs => ({
      code: obs.code,
      value: obs.value,
      unit: obs.units,
      flag: convertFlagToDeviceFormat(obs.abnormalFlag),
    })),
    rawPayload: rawMessage,
  };
}

/**
 * Convert our internal flag format to device format
 */
function convertFlagToDeviceFormat(
  flag: 'normal' | 'low' | 'high' | 'critical-low' | 'critical-high'
): string {
  switch (flag) {
    case 'low': return 'L';
    case 'high': return 'H';
    case 'critical-low': return 'LL';
    case 'critical-high': return 'HH';
    case 'normal':
    default: return 'N';
  }
}

/**
 * Extract device identifier from ASTM header
 */
export function extractDeviceIdentifier(header: HeaderRecord): string {
  // Use sender name/ID as device identifier
  return (header.senderNameOrId || 'UNKNOWN_DEVICE').toUpperCase().replace(/\s+/g, '_');
}

/**
 * Validate ASTM message has required components
 */
export function validateASTMMessage(message: ASTMMessage): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Must have header
  if (!message.header) {
    errors.push('Missing Header record (H)');
  }
  
  // Should have at least one patient or order
  if (message.patients.length === 0) {
    // Check if there are orders without patients (some analyzers do this)
    errors.push('No patient or order records found');
  }
  
  // Check for results
  let hasResults = false;
  for (const patient of message.patients) {
    for (const order of patient.orders) {
      if (order.results.length > 0) {
        hasResults = true;
        break;
      }
    }
    if (hasResults) break;
  }
  
  if (!hasResults) {
    errors.push('No result records (R) found');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get summary statistics from ASTM message
 */
export function getMessageStats(message: ASTMMessage): {
  patientCount: number;
  orderCount: number;
  resultCount: number;
  hasTerminator: boolean;
} {
  let orderCount = 0;
  let resultCount = 0;
  
  for (const patient of message.patients) {
    orderCount += patient.orders.length;
    for (const order of patient.orders) {
      resultCount += order.results.length;
    }
  }
  
  return {
    patientCount: message.patients.length,
    orderCount,
    resultCount,
    hasTerminator: !!message.terminator,
  };
}
