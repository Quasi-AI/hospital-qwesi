/**
 * HL7 v2 ORU^R01 Message Handler
 * 
 * Processes Observation Result messages and creates DeviceResult records
 */

import {
  HL7Message,
  getSegments,
  getSegment,
  parsePID,
  parseOBR,
  parseOBX,
  parseHL7DateTime,
  mapAbnormalFlag,
  PIDSegment,
  OBRSegment,
  OBXSegment,
} from './parser';

// Extracted result from ORU message
export interface ORUResult {
  // Patient Information
  patientId: string;
  patientName: string;
  dateOfBirth: Date | null;
  sex: string;
  
  // Order Information
  placerOrderNumber: string;
  fillerOrderNumber: string;
  sampleId: string;
  testCode: string;
  testName: string;
  observationDateTime: Date | null;
  resultStatus: string;
  
  // Results
  observations: ORUObservation[];
  
  // Source Information
  sendingApplication: string;
  sendingFacility: string;
  messageControlId: string;
  messageDateTime: Date | null;
}

export interface ORUObservation {
  setId: string;
  code: string;
  name: string;
  value: string;
  valueType: string;
  units: string;
  referenceRange: string;
  abnormalFlag: 'normal' | 'low' | 'high' | 'critical-low' | 'critical-high';
  resultStatus: string;
  observationDateTime: Date | null;
}

/**
 * Process an ORU^R01 message and extract results
 */
export function processORUMessage(message: HL7Message): ORUResult[] {
  // Verify message type
  if (!message.messageType.startsWith('ORU')) {
    throw new Error(`Expected ORU message, got ${message.messageType}`);
  }
  
  const results: ORUResult[] = [];
  const segments = message.segments;
  
  // Track current context
  let currentPID: PIDSegment | null = null;
  let currentOBR: OBRSegment | null = null;
  let currentObservations: ORUObservation[] = [];
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    
    switch (segment.name) {
      case 'PID':
        // Start of new patient context
        // If we have pending results, save them
        if (currentOBR && currentObservations.length > 0) {
          results.push(buildORUResult(
            message,
            currentPID,
            currentOBR,
            currentObservations
          ));
          currentObservations = [];
        }
        currentPID = parsePID(segment);
        break;
        
      case 'OBR':
        // Start of new order/request
        // If we have pending observations, save them with previous OBR
        if (currentOBR && currentObservations.length > 0) {
          results.push(buildORUResult(
            message,
            currentPID,
            currentOBR,
            currentObservations
          ));
          currentObservations = [];
        }
        currentOBR = parseOBR(segment);
        break;
        
      case 'OBX':
        // Observation result
        const obx = parseOBX(segment);
        currentObservations.push({
          setId: obx.setId,
          code: obx.observationId,
          name: obx.observationIdText || obx.observationId,
          value: obx.observationValue,
          valueType: obx.valueType,
          units: obx.units,
          referenceRange: obx.referenceRange,
          abnormalFlag: mapAbnormalFlag(obx.abnormalFlags),
          resultStatus: obx.observationResultStatus,
          observationDateTime: parseHL7DateTime(obx.dateTimeOfObservation),
        });
        break;
    }
  }
  
  // Don't forget the last batch of observations
  if (currentOBR && currentObservations.length > 0) {
    results.push(buildORUResult(
      message,
      currentPID,
      currentOBR,
      currentObservations
    ));
  }
  
  return results;
}

/**
 * Build an ORUResult from parsed segments
 */
function buildORUResult(
  message: HL7Message,
  pid: PIDSegment | null,
  obr: OBRSegment,
  observations: ORUObservation[]
): ORUResult {
  // Determine sample ID - use placer or filler order number
  const sampleId = obr.placerOrderNumber || obr.fillerOrderNumber || '';
  
  return {
    // Patient Information
    patientId: pid?.patientIdList || pid?.patientId || '',
    patientName: pid?.patientName || '',
    dateOfBirth: pid ? parseHL7DateTime(pid.dateOfBirth) : null,
    sex: pid?.sex || '',
    
    // Order Information
    placerOrderNumber: obr.placerOrderNumber,
    fillerOrderNumber: obr.fillerOrderNumber,
    sampleId,
    testCode: obr.universalServiceId,
    testName: obr.universalServiceIdText || obr.universalServiceId,
    observationDateTime: parseHL7DateTime(obr.observationDateTime),
    resultStatus: obr.resultStatus,
    
    // Results
    observations,
    
    // Source Information
    sendingApplication: message.sendingApplication,
    sendingFacility: message.sendingFacility,
    messageControlId: message.messageControlId,
    messageDateTime: parseHL7DateTime(message.dateTime),
  };
}

/**
 * Convert ORU results to the format expected by DeviceResult model
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

export function convertToDeviceResultInput(oruResult: ORUResult, rawMessage: string): DeviceResultInput {
  return {
    sampleId: oruResult.sampleId || oruResult.fillerOrderNumber || oruResult.placerOrderNumber,
    patientId: oruResult.patientId,
    patientName: oruResult.patientName,
    analyzedAt: oruResult.observationDateTime || undefined,
    results: oruResult.observations.map(obs => ({
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
function convertFlagToDeviceFormat(flag: 'normal' | 'low' | 'high' | 'critical-low' | 'critical-high'): string {
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
 * Validate an ORU^R01 message has required segments
 */
export function validateORUMessage(message: HL7Message): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Must have MSH
  const msh = getSegment(message, 'MSH');
  if (!msh) {
    errors.push('Missing MSH segment');
  }
  
  // Should have at least one PID for patient context
  const pidSegments = getSegments(message, 'PID');
  if (pidSegments.length === 0) {
    // Warning, not error - some systems send results without patient info
    console.warn('ORU message missing PID segment');
  }
  
  // Must have at least one OBR
  const obrSegments = getSegments(message, 'OBR');
  if (obrSegments.length === 0) {
    errors.push('Missing OBR segment - no order/request information');
  }
  
  // Must have at least one OBX
  const obxSegments = getSegments(message, 'OBX');
  if (obxSegments.length === 0) {
    errors.push('Missing OBX segments - no observation results');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Extract device identifier from HL7 message
 * Uses sending application/facility as device identifier
 */
export function extractDeviceIdentifier(message: HL7Message): string {
  // Combine sending application and facility as device identifier
  const parts = [message.sendingApplication, message.sendingFacility].filter(Boolean);
  return parts.join('_').toUpperCase() || 'UNKNOWN_DEVICE';
}
