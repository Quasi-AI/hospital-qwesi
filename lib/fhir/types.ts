/**
 * FHIR R4 Type Definitions
 * 
 * Subset of FHIR R4 types relevant for lab results integration.
 * Based on HL7 FHIR R4 specification.
 */

// Common FHIR Types

export interface FHIRReference {
  reference?: string;
  type?: string;
  identifier?: FHIRIdentifier;
  display?: string;
}

export interface FHIRIdentifier {
  use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
  type?: FHIRCodeableConcept;
  system?: string;
  value?: string;
  period?: FHIRPeriod;
  assigner?: FHIRReference;
}

export interface FHIRCoding {
  system?: string;
  version?: string;
  code?: string;
  display?: string;
  userSelected?: boolean;
}

export interface FHIRCodeableConcept {
  coding?: FHIRCoding[];
  text?: string;
}

export interface FHIRPeriod {
  start?: string;
  end?: string;
}

export interface FHIRQuantity {
  value?: number;
  comparator?: '<' | '<=' | '>=' | '>';
  unit?: string;
  system?: string;
  code?: string;
}

export interface FHIRRange {
  low?: FHIRQuantity;
  high?: FHIRQuantity;
}

export interface FHIRRatio {
  numerator?: FHIRQuantity;
  denominator?: FHIRQuantity;
}

export interface FHIRAnnotation {
  authorReference?: FHIRReference;
  authorString?: string;
  time?: string;
  text: string;
}

export interface FHIRMeta {
  versionId?: string;
  lastUpdated?: string;
  source?: string;
  profile?: string[];
  security?: FHIRCoding[];
  tag?: FHIRCoding[];
}

// Base Resource
export interface FHIRResource {
  resourceType: string;
  id?: string;
  meta?: FHIRMeta;
  implicitRules?: string;
  language?: string;
}

// Observation Resource
export type ObservationStatus = 
  | 'registered'
  | 'preliminary'
  | 'final'
  | 'amended'
  | 'corrected'
  | 'cancelled'
  | 'entered-in-error'
  | 'unknown';

export interface FHIRObservationReferenceRange {
  low?: FHIRQuantity;
  high?: FHIRQuantity;
  type?: FHIRCodeableConcept;
  appliesTo?: FHIRCodeableConcept[];
  age?: FHIRRange;
  text?: string;
}

export interface FHIRObservationComponent {
  code: FHIRCodeableConcept;
  valueQuantity?: FHIRQuantity;
  valueCodeableConcept?: FHIRCodeableConcept;
  valueString?: string;
  valueBoolean?: boolean;
  valueInteger?: number;
  valueRange?: FHIRRange;
  valueRatio?: FHIRRatio;
  valueSampledData?: any;
  valueTime?: string;
  valueDateTime?: string;
  valuePeriod?: FHIRPeriod;
  dataAbsentReason?: FHIRCodeableConcept;
  interpretation?: FHIRCodeableConcept[];
  referenceRange?: FHIRObservationReferenceRange[];
}

export interface FHIRObservation extends FHIRResource {
  resourceType: 'Observation';
  identifier?: FHIRIdentifier[];
  basedOn?: FHIRReference[];
  partOf?: FHIRReference[];
  status: ObservationStatus;
  category?: FHIRCodeableConcept[];
  code: FHIRCodeableConcept;
  subject?: FHIRReference;
  focus?: FHIRReference[];
  encounter?: FHIRReference;
  effectiveDateTime?: string;
  effectivePeriod?: FHIRPeriod;
  effectiveTiming?: any;
  effectiveInstant?: string;
  issued?: string;
  performer?: FHIRReference[];
  valueQuantity?: FHIRQuantity;
  valueCodeableConcept?: FHIRCodeableConcept;
  valueString?: string;
  valueBoolean?: boolean;
  valueInteger?: number;
  valueRange?: FHIRRange;
  valueRatio?: FHIRRatio;
  valueSampledData?: any;
  valueTime?: string;
  valueDateTime?: string;
  valuePeriod?: FHIRPeriod;
  dataAbsentReason?: FHIRCodeableConcept;
  interpretation?: FHIRCodeableConcept[];
  note?: FHIRAnnotation[];
  bodySite?: FHIRCodeableConcept;
  method?: FHIRCodeableConcept;
  specimen?: FHIRReference;
  device?: FHIRReference;
  referenceRange?: FHIRObservationReferenceRange[];
  hasMember?: FHIRReference[];
  derivedFrom?: FHIRReference[];
  component?: FHIRObservationComponent[];
}

// DiagnosticReport Resource
export type DiagnosticReportStatus =
  | 'registered'
  | 'partial'
  | 'preliminary'
  | 'final'
  | 'amended'
  | 'corrected'
  | 'appended'
  | 'cancelled'
  | 'entered-in-error'
  | 'unknown';

export interface FHIRDiagnosticReportMedia {
  comment?: string;
  link: FHIRReference;
}

export interface FHIRDiagnosticReport extends FHIRResource {
  resourceType: 'DiagnosticReport';
  identifier?: FHIRIdentifier[];
  basedOn?: FHIRReference[];
  status: DiagnosticReportStatus;
  category?: FHIRCodeableConcept[];
  code: FHIRCodeableConcept;
  subject?: FHIRReference;
  encounter?: FHIRReference;
  effectiveDateTime?: string;
  effectivePeriod?: FHIRPeriod;
  issued?: string;
  performer?: FHIRReference[];
  resultsInterpreter?: FHIRReference[];
  specimen?: FHIRReference[];
  result?: FHIRReference[];
  imagingStudy?: FHIRReference[];
  media?: FHIRDiagnosticReportMedia[];
  conclusion?: string;
  conclusionCode?: FHIRCodeableConcept[];
  presentedForm?: any[];
}

// Patient Resource (simplified)
export interface FHIRPatient extends FHIRResource {
  resourceType: 'Patient';
  identifier?: FHIRIdentifier[];
  active?: boolean;
  name?: FHIRHumanName[];
  telecom?: FHIRContactPoint[];
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  deceasedBoolean?: boolean;
  deceasedDateTime?: string;
  address?: FHIRAddress[];
}

export interface FHIRHumanName {
  use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';
  text?: string;
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
  period?: FHIRPeriod;
}

export interface FHIRContactPoint {
  system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
  value?: string;
  use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
  rank?: number;
  period?: FHIRPeriod;
}

export interface FHIRAddress {
  use?: 'home' | 'work' | 'temp' | 'old' | 'billing';
  type?: 'postal' | 'physical' | 'both';
  text?: string;
  line?: string[];
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  period?: FHIRPeriod;
}

// Specimen Resource (simplified)
export interface FHIRSpecimen extends FHIRResource {
  resourceType: 'Specimen';
  identifier?: FHIRIdentifier[];
  accessionIdentifier?: FHIRIdentifier;
  status?: 'available' | 'unavailable' | 'unsatisfactory' | 'entered-in-error';
  type?: FHIRCodeableConcept;
  subject?: FHIRReference;
  receivedTime?: string;
  parent?: FHIRReference[];
  request?: FHIRReference[];
  collection?: {
    collector?: FHIRReference;
    collectedDateTime?: string;
    collectedPeriod?: FHIRPeriod;
    duration?: any;
    quantity?: FHIRQuantity;
    method?: FHIRCodeableConcept;
    bodySite?: FHIRCodeableConcept;
    fastingStatusCodeableConcept?: FHIRCodeableConcept;
    fastingStatusDuration?: any;
  };
}

// ServiceRequest Resource (for orders)
export interface FHIRServiceRequest extends FHIRResource {
  resourceType: 'ServiceRequest';
  identifier?: FHIRIdentifier[];
  instantiatesCanonical?: string[];
  instantiatesUri?: string[];
  basedOn?: FHIRReference[];
  replaces?: FHIRReference[];
  requisition?: FHIRIdentifier;
  status: 'draft' | 'active' | 'on-hold' | 'revoked' | 'completed' | 'entered-in-error' | 'unknown';
  intent: 'proposal' | 'plan' | 'directive' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option';
  category?: FHIRCodeableConcept[];
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';
  doNotPerform?: boolean;
  code?: FHIRCodeableConcept;
  orderDetail?: FHIRCodeableConcept[];
  quantityQuantity?: FHIRQuantity;
  quantityRatio?: FHIRRatio;
  quantityRange?: FHIRRange;
  subject: FHIRReference;
  encounter?: FHIRReference;
  occurrenceDateTime?: string;
  occurrencePeriod?: FHIRPeriod;
  occurrenceTiming?: any;
  asNeededBoolean?: boolean;
  asNeededCodeableConcept?: FHIRCodeableConcept;
  authoredOn?: string;
  requester?: FHIRReference;
  performerType?: FHIRCodeableConcept;
  performer?: FHIRReference[];
  locationCode?: FHIRCodeableConcept[];
  locationReference?: FHIRReference[];
  reasonCode?: FHIRCodeableConcept[];
  reasonReference?: FHIRReference[];
  insurance?: FHIRReference[];
  supportingInfo?: FHIRReference[];
  specimen?: FHIRReference[];
  bodySite?: FHIRCodeableConcept[];
  note?: FHIRAnnotation[];
  patientInstruction?: string;
  relevantHistory?: FHIRReference[];
}

// Bundle Resource
export type BundleType = 
  | 'document'
  | 'message'
  | 'transaction'
  | 'transaction-response'
  | 'batch'
  | 'batch-response'
  | 'history'
  | 'searchset'
  | 'collection';

export interface FHIRBundleEntry {
  link?: any[];
  fullUrl?: string;
  resource?: FHIRResource;
  search?: {
    mode?: 'match' | 'include' | 'outcome';
    score?: number;
  };
  request?: {
    method: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url: string;
    ifNoneMatch?: string;
    ifModifiedSince?: string;
    ifMatch?: string;
    ifNoneExist?: string;
  };
  response?: {
    status: string;
    location?: string;
    etag?: string;
    lastModified?: string;
    outcome?: FHIRResource;
  };
}

export interface FHIRBundle extends FHIRResource {
  resourceType: 'Bundle';
  identifier?: FHIRIdentifier;
  type: BundleType;
  timestamp?: string;
  total?: number;
  link?: {
    relation: string;
    url: string;
  }[];
  entry?: FHIRBundleEntry[];
  signature?: any;
}

// OperationOutcome Resource (for errors)
export interface FHIROperationOutcomeIssue {
  severity: 'fatal' | 'error' | 'warning' | 'information';
  code: string;
  details?: FHIRCodeableConcept;
  diagnostics?: string;
  location?: string[];
  expression?: string[];
}

export interface FHIROperationOutcome extends FHIRResource {
  resourceType: 'OperationOutcome';
  issue: FHIROperationOutcomeIssue[];
}

// Device Resource (simplified for lab devices)
export interface FHIRDevice extends FHIRResource {
  resourceType: 'Device';
  identifier?: FHIRIdentifier[];
  definition?: FHIRReference;
  udiCarrier?: any[];
  status?: 'active' | 'inactive' | 'entered-in-error' | 'unknown';
  statusReason?: FHIRCodeableConcept[];
  distinctIdentifier?: string;
  manufacturer?: string;
  manufactureDate?: string;
  expirationDate?: string;
  lotNumber?: string;
  serialNumber?: string;
  deviceName?: {
    name: string;
    type: 'udi-label-name' | 'user-friendly-name' | 'patient-reported-name' | 'manufacturer-name' | 'model-name' | 'other';
  }[];
  modelNumber?: string;
  partNumber?: string;
  type?: FHIRCodeableConcept;
  specialization?: any[];
  version?: any[];
  property?: any[];
  patient?: FHIRReference;
  owner?: FHIRReference;
  contact?: FHIRContactPoint[];
  location?: FHIRReference;
  url?: string;
  note?: FHIRAnnotation[];
  safety?: FHIRCodeableConcept[];
  parent?: FHIRReference;
}

// Common coding systems
export const FHIR_CODING_SYSTEMS = {
  LOINC: 'http://loinc.org',
  SNOMED_CT: 'http://snomed.info/sct',
  ICD_10: 'http://hl7.org/fhir/sid/icd-10',
  ICD_10_CM: 'http://hl7.org/fhir/sid/icd-10-cm',
  UCUM: 'http://unitsofmeasure.org',
  HL7_V2: 'http://terminology.hl7.org/CodeSystem/v2-0078',
  HL7_V3: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
  OBSERVATION_CATEGORY: 'http://terminology.hl7.org/CodeSystem/observation-category',
  DIAGNOSTIC_SERVICE_SECTIONS: 'http://terminology.hl7.org/CodeSystem/v2-0074',
} as const;

// Interpretation codes
export const FHIR_INTERPRETATION_CODES = {
  NORMAL: { code: 'N', display: 'Normal', system: FHIR_CODING_SYSTEMS.HL7_V3 },
  LOW: { code: 'L', display: 'Low', system: FHIR_CODING_SYSTEMS.HL7_V3 },
  HIGH: { code: 'H', display: 'High', system: FHIR_CODING_SYSTEMS.HL7_V3 },
  CRITICAL_LOW: { code: 'LL', display: 'Critical low', system: FHIR_CODING_SYSTEMS.HL7_V3 },
  CRITICAL_HIGH: { code: 'HH', display: 'Critical high', system: FHIR_CODING_SYSTEMS.HL7_V3 },
  ABNORMAL: { code: 'A', display: 'Abnormal', system: FHIR_CODING_SYSTEMS.HL7_V3 },
} as const;
