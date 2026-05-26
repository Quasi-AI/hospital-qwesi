/**
 * FHIR R4 to DeviceResult Mapper
 * 
 * Maps FHIR DiagnosticReport and Observation resources to the internal DeviceResult format.
 */

import {
  FHIRDiagnosticReport,
  FHIRObservation,
  FHIRBundle,
  FHIRCodeableConcept,
  FHIRQuantity,
  FHIRReference,
  FHIROperationOutcome,
  FHIR_INTERPRETATION_CODES,
} from './types';

// Device result input for creating DeviceResult records
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
    referenceRange?: string;
  }[];
  rawPayload: string;
}

// Extracted data from FHIR resources
export interface FHIRExtractedResult {
  patientId: string;
  patientName?: string;
  specimenId: string;
  testCode: string;
  testName: string;
  effectiveDateTime?: Date;
  observations: FHIRExtractedObservation[];
  deviceIdentifier?: string;
  performerIdentifier?: string;
}

export interface FHIRExtractedObservation {
  code: string;
  name: string;
  value: string;
  valueType: 'quantity' | 'string' | 'codeable' | 'boolean' | 'integer';
  units: string;
  referenceRange: string;
  abnormalFlag: 'normal' | 'low' | 'high' | 'critical-low' | 'critical-high';
  status: string;
  effectiveDateTime?: Date;
}

/**
 * Extract text from CodeableConcept
 */
export function extractCodeableConceptText(concept?: FHIRCodeableConcept): string {
  if (!concept) return '';
  if (concept.text) return concept.text;
  if (concept.coding && concept.coding.length > 0) {
    const coding = concept.coding[0];
    return coding.display || coding.code || '';
  }
  return '';
}

/**
 * Extract code from CodeableConcept
 */
export function extractCodeableConceptCode(concept?: FHIRCodeableConcept): string {
  if (!concept) return '';
  if (concept.coding && concept.coding.length > 0) {
    return concept.coding[0].code || '';
  }
  return '';
}

/**
 * Extract ID from FHIR Reference
 */
export function extractReferenceId(reference?: FHIRReference): string {
  if (!reference) return '';
  if (reference.identifier?.value) {
    return reference.identifier.value;
  }
  if (reference.reference) {
    // Format: "ResourceType/id" or just "id"
    const parts = reference.reference.split('/');
    return parts[parts.length - 1];
  }
  return '';
}

/**
 * Extract display from FHIR Reference
 */
export function extractReferenceDisplay(reference?: FHIRReference): string {
  if (!reference) return '';
  return reference.display || '';
}

/**
 * Map FHIR interpretation codes to internal flag format
 */
export function mapInterpretationToFlag(
  interpretation?: FHIRCodeableConcept[]
): 'normal' | 'low' | 'high' | 'critical-low' | 'critical-high' {
  if (!interpretation || interpretation.length === 0) {
    return 'normal';
  }
  
  const code = extractCodeableConceptCode(interpretation[0]).toUpperCase();
  
  switch (code) {
    case 'L':
    case 'LOW':
      return 'low';
    case 'H':
    case 'HIGH':
      return 'high';
    case 'LL':
    case 'CRITICAL_LOW':
      return 'critical-low';
    case 'HH':
    case 'CRITICAL_HIGH':
      return 'critical-high';
    case 'A':
    case 'ABNORMAL':
      // Abnormal without direction, default to high
      return 'high';
    case 'N':
    case 'NORMAL':
    default:
      return 'normal';
  }
}

/**
 * Convert internal flag to FHIR interpretation code
 */
export function flagToInterpretation(
  flag: 'normal' | 'low' | 'high' | 'critical-low' | 'critical-high'
): FHIRCodeableConcept {
  const codes = {
    'normal': FHIR_INTERPRETATION_CODES.NORMAL,
    'low': FHIR_INTERPRETATION_CODES.LOW,
    'high': FHIR_INTERPRETATION_CODES.HIGH,
    'critical-low': FHIR_INTERPRETATION_CODES.CRITICAL_LOW,
    'critical-high': FHIR_INTERPRETATION_CODES.CRITICAL_HIGH,
  };
  
  const code = codes[flag];
  return {
    coding: [{
      system: code.system,
      code: code.code,
      display: code.display,
    }],
  };
}

/**
 * Extract value from Observation
 */
export function extractObservationValue(observation: FHIRObservation): {
  value: string;
  valueType: 'quantity' | 'string' | 'codeable' | 'boolean' | 'integer';
  units: string;
} {
  if (observation.valueQuantity) {
    return {
      value: observation.valueQuantity.value?.toString() || '',
      valueType: 'quantity',
      units: observation.valueQuantity.unit || observation.valueQuantity.code || '',
    };
  }
  
  if (observation.valueString !== undefined) {
    return {
      value: observation.valueString,
      valueType: 'string',
      units: '',
    };
  }
  
  if (observation.valueCodeableConcept) {
    return {
      value: extractCodeableConceptText(observation.valueCodeableConcept),
      valueType: 'codeable',
      units: '',
    };
  }
  
  if (observation.valueBoolean !== undefined) {
    return {
      value: observation.valueBoolean.toString(),
      valueType: 'boolean',
      units: '',
    };
  }
  
  if (observation.valueInteger !== undefined) {
    return {
      value: observation.valueInteger.toString(),
      valueType: 'integer',
      units: '',
    };
  }
  
  return {
    value: '',
    valueType: 'string',
    units: '',
  };
}

/**
 * Extract reference range from Observation
 */
export function extractReferenceRange(observation: FHIRObservation): string {
  if (!observation.referenceRange || observation.referenceRange.length === 0) {
    return '';
  }
  
  const range = observation.referenceRange[0];
  
  if (range.text) {
    return range.text;
  }
  
  const low = range.low?.value;
  const high = range.high?.value;
  
  if (low !== undefined && high !== undefined) {
    const unit = range.low?.unit || range.high?.unit || '';
    return `${low}-${high}${unit ? ' ' + unit : ''}`;
  }
  
  if (low !== undefined) {
    return `>${low}`;
  }
  
  if (high !== undefined) {
    return `<${high}`;
  }
  
  return '';
}

/**
 * Process a single FHIR Observation and extract result
 */
export function processObservation(observation: FHIRObservation): FHIRExtractedObservation {
  const { value, valueType, units } = extractObservationValue(observation);
  
  return {
    code: extractCodeableConceptCode(observation.code),
    name: extractCodeableConceptText(observation.code),
    value,
    valueType,
    units,
    referenceRange: extractReferenceRange(observation),
    abnormalFlag: mapInterpretationToFlag(observation.interpretation),
    status: observation.status,
    effectiveDateTime: observation.effectiveDateTime 
      ? new Date(observation.effectiveDateTime) 
      : undefined,
  };
}

/**
 * Process a FHIR DiagnosticReport with embedded Observations
 */
export function processDiagnosticReport(
  report: FHIRDiagnosticReport,
  observations: FHIRObservation[]
): FHIRExtractedResult {
  // Map observation references to actual observations
  const observationMap = new Map<string, FHIRObservation>();
  for (const obs of observations) {
    if (obs.id) {
      observationMap.set(obs.id, obs);
      observationMap.set(`Observation/${obs.id}`, obs);
    }
  }
  
  // Extract results from referenced observations
  const extractedObservations: FHIRExtractedObservation[] = [];
  
  if (report.result) {
    for (const resultRef of report.result) {
      const refId = extractReferenceId(resultRef);
      const obs = observationMap.get(refId) || observationMap.get(`Observation/${refId}`);
      if (obs) {
        extractedObservations.push(processObservation(obs));
      }
    }
  }
  
  // If no referenced observations, check if any observations reference this report
  if (extractedObservations.length === 0) {
    for (const obs of observations) {
      extractedObservations.push(processObservation(obs));
    }
  }
  
  return {
    patientId: extractReferenceId(report.subject),
    patientName: extractReferenceDisplay(report.subject),
    specimenId: report.specimen && report.specimen.length > 0 
      ? extractReferenceId(report.specimen[0])
      : report.id || '',
    testCode: extractCodeableConceptCode(report.code),
    testName: extractCodeableConceptText(report.code),
    effectiveDateTime: report.effectiveDateTime 
      ? new Date(report.effectiveDateTime)
      : report.issued 
        ? new Date(report.issued)
        : undefined,
    observations: extractedObservations,
    performerIdentifier: report.performer && report.performer.length > 0
      ? extractReferenceId(report.performer[0])
      : undefined,
  };
}

/**
 * Process a FHIR Bundle containing DiagnosticReport and Observations
 */
export function processBundle(bundle: FHIRBundle): FHIRExtractedResult[] {
  const results: FHIRExtractedResult[] = [];
  
  if (!bundle.entry || bundle.entry.length === 0) {
    return results;
  }
  
  // Separate resources by type
  const diagnosticReports: FHIRDiagnosticReport[] = [];
  const observations: FHIRObservation[] = [];
  
  for (const entry of bundle.entry) {
    if (!entry.resource) continue;
    
    if (entry.resource.resourceType === 'DiagnosticReport') {
      diagnosticReports.push(entry.resource as FHIRDiagnosticReport);
    } else if (entry.resource.resourceType === 'Observation') {
      observations.push(entry.resource as FHIRObservation);
    }
  }
  
  // Process each DiagnosticReport
  for (const report of diagnosticReports) {
    results.push(processDiagnosticReport(report, observations));
  }
  
  // If no DiagnosticReports, create results from standalone observations
  if (diagnosticReports.length === 0 && observations.length > 0) {
    // Group observations by specimen or subject
    const grouped = new Map<string, FHIRObservation[]>();
    
    for (const obs of observations) {
      const key = extractReferenceId(obs.specimen) || 
                  extractReferenceId(obs.subject) || 
                  'default';
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(obs);
    }
    
    for (const [key, groupedObs] of grouped) {
      const firstObs = groupedObs[0];
      results.push({
        patientId: extractReferenceId(firstObs.subject),
        patientName: extractReferenceDisplay(firstObs.subject),
        specimenId: key === 'default' ? '' : key,
        testCode: '',
        testName: 'Lab Results',
        effectiveDateTime: firstObs.effectiveDateTime 
          ? new Date(firstObs.effectiveDateTime)
          : undefined,
        observations: groupedObs.map(processObservation),
      });
    }
  }
  
  return results;
}

/**
 * Convert extracted FHIR result to DeviceResultInput
 */
export function convertToDeviceResultInput(
  result: FHIRExtractedResult,
  rawPayload: string
): DeviceResultInput {
  return {
    sampleId: result.specimenId || result.patientId,
    patientId: result.patientId,
    patientName: result.patientName,
    analyzedAt: result.effectiveDateTime,
    results: result.observations.map(obs => ({
      code: obs.code,
      value: obs.value,
      unit: obs.units,
      flag: convertFlagToDeviceFormat(obs.abnormalFlag),
      referenceRange: obs.referenceRange,
    })),
    rawPayload,
  };
}

/**
 * Convert internal flag to device format
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
 * Create a FHIR OperationOutcome for success
 */
export function createSuccessOutcome(message: string): FHIROperationOutcome {
  return {
    resourceType: 'OperationOutcome',
    issue: [{
      severity: 'information',
      code: 'informational',
      diagnostics: message,
    }],
  };
}

/**
 * Create a FHIR OperationOutcome for errors
 */
export function createErrorOutcome(
  message: string,
  code: string = 'processing',
  severity: 'fatal' | 'error' | 'warning' = 'error'
): FHIROperationOutcome {
  return {
    resourceType: 'OperationOutcome',
    issue: [{
      severity,
      code,
      diagnostics: message,
    }],
  };
}

/**
 * Validate a FHIR DiagnosticReport
 */
export function validateDiagnosticReport(report: FHIRDiagnosticReport): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (report.resourceType !== 'DiagnosticReport') {
    errors.push('Resource must be DiagnosticReport');
  }
  
  if (!report.status) {
    errors.push('Missing required field: status');
  }
  
  if (!report.code) {
    errors.push('Missing required field: code');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a FHIR Observation
 */
export function validateObservation(observation: FHIRObservation): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (observation.resourceType !== 'Observation') {
    errors.push('Resource must be Observation');
  }
  
  if (!observation.status) {
    errors.push('Missing required field: status');
  }
  
  if (!observation.code) {
    errors.push('Missing required field: code');
  }
  
  // Must have a value
  const hasValue = observation.valueQuantity !== undefined ||
                   observation.valueString !== undefined ||
                   observation.valueCodeableConcept !== undefined ||
                   observation.valueBoolean !== undefined ||
                   observation.valueInteger !== undefined ||
                   observation.dataAbsentReason !== undefined;
  
  if (!hasValue) {
    errors.push('Observation must have a value or dataAbsentReason');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a FHIR Bundle
 */
export function validateBundle(bundle: FHIRBundle): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (bundle.resourceType !== 'Bundle') {
    errors.push('Resource must be Bundle');
  }
  
  if (!bundle.type) {
    errors.push('Missing required field: type');
  }
  
  if (!bundle.entry || bundle.entry.length === 0) {
    errors.push('Bundle must contain at least one entry');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
