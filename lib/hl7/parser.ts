/**
 * HL7 v2.x Message Parser
 * 
 * Parses HL7 v2.x messages into structured objects.
 * Supports common message types including ORU^R01 (Observation Results)
 */

// HL7 v2 Encoding Characters
export interface HL7EncodingChars {
  fieldSeparator: string;      // Default: |
  componentSeparator: string;  // Default: ^
  repetitionSeparator: string; // Default: ~
  escapeCharacter: string;     // Default: \
  subcomponentSeparator: string; // Default: &
}

// Parsed HL7 Segment
export interface HL7Segment {
  name: string;
  fields: HL7Field[];
  raw: string;
}

// HL7 Field (can have components and repetitions)
export interface HL7Field {
  value: string;
  components: string[];
  repetitions: HL7FieldRepetition[];
}

export interface HL7FieldRepetition {
  value: string;
  components: string[];
}

// Parsed HL7 Message
export interface HL7Message {
  raw: string;
  encoding: HL7EncodingChars;
  segments: HL7Segment[];
  messageType: string;
  messageControlId: string;
  sendingApplication: string;
  sendingFacility: string;
  receivingApplication: string;
  receivingFacility: string;
  dateTime: string;
  version: string;
}

// MSH Segment (Message Header)
export interface MSHSegment {
  sendingApplication: string;
  sendingFacility: string;
  receivingApplication: string;
  receivingFacility: string;
  dateTime: string;
  messageType: string;
  triggerEvent: string;
  messageControlId: string;
  processingId: string;
  version: string;
}

// PID Segment (Patient Identification)
export interface PIDSegment {
  setId: string;
  patientId: string;
  patientIdList: string;
  alternatePatientId: string;
  patientName: string;
  motherMaidenName: string;
  dateOfBirth: string;
  sex: string;
  patientAlias: string;
  race: string;
  address: string;
  countryCode: string;
  phoneHome: string;
  phoneBusiness: string;
}

// OBR Segment (Observation Request)
export interface OBRSegment {
  setId: string;
  placerOrderNumber: string;
  fillerOrderNumber: string;
  universalServiceId: string;
  universalServiceIdText: string;
  priority: string;
  requestedDateTime: string;
  observationDateTime: string;
  observationEndDateTime: string;
  collectionVolume: string;
  collectorId: string;
  specimenActionCode: string;
  dangerCode: string;
  relevantClinicalInfo: string;
  specimenReceivedDateTime: string;
  specimenSource: string;
  orderingProvider: string;
  resultStatus: string;
}

// OBX Segment (Observation/Result)
export interface OBXSegment {
  setId: string;
  valueType: string;
  observationId: string;
  observationIdText: string;
  observationSubId: string;
  observationValue: string;
  units: string;
  referenceRange: string;
  abnormalFlags: string;
  probability: string;
  natureOfAbnormalTest: string;
  observationResultStatus: string;
  effectiveDateTime: string;
  userDefinedAccessChecks: string;
  dateTimeOfObservation: string;
  producerId: string;
  responsibleObserver: string;
  observationMethod: string;
}

/**
 * Parse HL7 v2 message string into structured object
 */
export function parseHL7Message(rawMessage: string): HL7Message {
  // Normalize line endings
  const message = rawMessage.replace(/\r\n/g, '\r').replace(/\n/g, '\r');
  
  // Split into segments
  const segmentStrings = message.split('\r').filter(s => s.trim());
  
  if (segmentStrings.length === 0) {
    throw new Error('Empty HL7 message');
  }
  
  // First segment must be MSH
  const mshSegment = segmentStrings[0];
  if (!mshSegment.startsWith('MSH')) {
    throw new Error('HL7 message must start with MSH segment');
  }
  
  // Extract encoding characters from MSH
  const encoding = parseEncodingChars(mshSegment);
  
  // Parse all segments
  const segments: HL7Segment[] = segmentStrings.map(seg => parseSegment(seg, encoding));
  
  // Extract header information
  const msh = parseMSH(segments[0], encoding);
  
  return {
    raw: rawMessage,
    encoding,
    segments,
    messageType: `${msh.messageType}^${msh.triggerEvent}`,
    messageControlId: msh.messageControlId,
    sendingApplication: msh.sendingApplication,
    sendingFacility: msh.sendingFacility,
    receivingApplication: msh.receivingApplication,
    receivingFacility: msh.receivingFacility,
    dateTime: msh.dateTime,
    version: msh.version,
  };
}

/**
 * Parse encoding characters from MSH segment
 */
function parseEncodingChars(mshSegment: string): HL7EncodingChars {
  // MSH-1 is the field separator (character after MSH)
  const fieldSeparator = mshSegment[3]; // Position 3 (after 'MSH')
  
  // MSH-2 contains the encoding characters
  const encodingField = mshSegment.substring(4, 8);
  
  return {
    fieldSeparator,
    componentSeparator: encodingField[0] || '^',
    repetitionSeparator: encodingField[1] || '~',
    escapeCharacter: encodingField[2] || '\\',
    subcomponentSeparator: encodingField[3] || '&',
  };
}

/**
 * Parse a single segment into structured format
 */
function parseSegment(segmentString: string, encoding: HL7EncodingChars): HL7Segment {
  const { fieldSeparator, componentSeparator, repetitionSeparator } = encoding;
  
  // Special handling for MSH segment (field separator is part of the segment name)
  let fields: string[];
  let segmentName: string;
  
  if (segmentString.startsWith('MSH')) {
    segmentName = 'MSH';
    // For MSH, the field separator IS field 1
    const restOfSegment = segmentString.substring(4);
    fields = ['MSH', fieldSeparator, ...restOfSegment.split(fieldSeparator)];
  } else {
    fields = segmentString.split(fieldSeparator);
    segmentName = fields[0];
  }
  
  const parsedFields: HL7Field[] = fields.map((field, index) => {
    // Skip segment name
    if (index === 0) {
      return { value: field, components: [field], repetitions: [] };
    }
    
    // Parse repetitions
    const repetitions = field.split(repetitionSeparator);
    const parsedRepetitions: HL7FieldRepetition[] = repetitions.map(rep => ({
      value: rep,
      components: rep.split(componentSeparator),
    }));
    
    // Primary value is first repetition
    const primaryValue = repetitions[0];
    const components = primaryValue.split(componentSeparator);
    
    return {
      value: primaryValue,
      components,
      repetitions: parsedRepetitions,
    };
  });
  
  return {
    name: segmentName,
    fields: parsedFields,
    raw: segmentString,
  };
}

/**
 * Parse MSH segment
 */
export function parseMSH(segment: HL7Segment, encoding: HL7EncodingChars): MSHSegment {
  const getField = (index: number) => segment.fields[index]?.value || '';
  const getComponent = (index: number, comp: number) => 
    segment.fields[index]?.components[comp] || '';
  
  return {
    sendingApplication: getField(3),
    sendingFacility: getField(4),
    receivingApplication: getField(5),
    receivingFacility: getField(6),
    dateTime: getField(7),
    messageType: getComponent(9, 0),
    triggerEvent: getComponent(9, 1),
    messageControlId: getField(10),
    processingId: getField(11),
    version: getField(12),
  };
}

/**
 * Parse PID segment
 */
export function parsePID(segment: HL7Segment): PIDSegment {
  const getField = (index: number) => segment.fields[index]?.value || '';
  const getComponent = (index: number, comp: number) => 
    segment.fields[index]?.components[comp] || '';
  
  // Patient name is usually in format: LAST^FIRST^MIDDLE
  const patientNameComponents = segment.fields[5]?.components || [];
  const patientName = patientNameComponents.length > 0
    ? `${patientNameComponents[0] || ''}${patientNameComponents[1] ? ', ' + patientNameComponents[1] : ''}`
    : '';
  
  return {
    setId: getField(1),
    patientId: getField(2),
    patientIdList: getField(3),
    alternatePatientId: getField(4),
    patientName,
    motherMaidenName: getField(6),
    dateOfBirth: getField(7),
    sex: getField(8),
    patientAlias: getField(9),
    race: getField(10),
    address: getField(11),
    countryCode: getField(12),
    phoneHome: getField(13),
    phoneBusiness: getField(14),
  };
}

/**
 * Parse OBR segment
 */
export function parseOBR(segment: HL7Segment): OBRSegment {
  const getField = (index: number) => segment.fields[index]?.value || '';
  const getComponent = (index: number, comp: number) => 
    segment.fields[index]?.components[comp] || '';
  
  return {
    setId: getField(1),
    placerOrderNumber: getField(2),
    fillerOrderNumber: getField(3),
    universalServiceId: getComponent(4, 0),
    universalServiceIdText: getComponent(4, 1),
    priority: getField(5),
    requestedDateTime: getField(6),
    observationDateTime: getField(7),
    observationEndDateTime: getField(8),
    collectionVolume: getField(9),
    collectorId: getField(10),
    specimenActionCode: getField(11),
    dangerCode: getField(12),
    relevantClinicalInfo: getField(13),
    specimenReceivedDateTime: getField(14),
    specimenSource: getField(15),
    orderingProvider: getField(16),
    resultStatus: getField(25),
  };
}

/**
 * Parse OBX segment
 */
export function parseOBX(segment: HL7Segment): OBXSegment {
  const getField = (index: number) => segment.fields[index]?.value || '';
  const getComponent = (index: number, comp: number) => 
    segment.fields[index]?.components[comp] || '';
  
  return {
    setId: getField(1),
    valueType: getField(2),
    observationId: getComponent(3, 0),
    observationIdText: getComponent(3, 1),
    observationSubId: getField(4),
    observationValue: getField(5),
    units: getComponent(6, 0),
    referenceRange: getField(7),
    abnormalFlags: getField(8),
    probability: getField(9),
    natureOfAbnormalTest: getField(10),
    observationResultStatus: getField(11),
    effectiveDateTime: getField(12),
    userDefinedAccessChecks: getField(13),
    dateTimeOfObservation: getField(14),
    producerId: getField(15),
    responsibleObserver: getField(16),
    observationMethod: getField(17),
  };
}

/**
 * Get all segments of a specific type from a message
 */
export function getSegments(message: HL7Message, segmentName: string): HL7Segment[] {
  return message.segments.filter(seg => seg.name === segmentName);
}

/**
 * Get the first segment of a specific type
 */
export function getSegment(message: HL7Message, segmentName: string): HL7Segment | undefined {
  return message.segments.find(seg => seg.name === segmentName);
}

/**
 * Build an HL7 ACK (Acknowledgment) message
 */
export function buildACK(
  originalMessage: HL7Message,
  ackCode: 'AA' | 'AE' | 'AR' = 'AA', // Application Accept, Error, Reject
  errorMessage?: string
): string {
  const now = new Date();
  const timestamp = formatHL7DateTime(now);
  const messageControlId = `ACK${Date.now()}`;
  
  const msh = [
    'MSH',
    '^~\\&',
    originalMessage.receivingApplication || 'HMS',
    originalMessage.receivingFacility || 'HOSPITAL',
    originalMessage.sendingApplication,
    originalMessage.sendingFacility,
    timestamp,
    '',
    'ACK^' + originalMessage.messageType.split('^')[1],
    messageControlId,
    'P',
    originalMessage.version || '2.5',
  ].join('|');
  
  const msa = [
    'MSA',
    ackCode,
    originalMessage.messageControlId,
    errorMessage || '',
  ].join('|');
  
  return msh + '\r' + msa;
}

/**
 * Format a Date to HL7 DateTime format (YYYYMMDDHHMMSS)
 */
export function formatHL7DateTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

/**
 * Parse HL7 DateTime format to Date object
 */
export function parseHL7DateTime(hl7DateTime: string): Date | null {
  if (!hl7DateTime || hl7DateTime.length < 8) {
    return null;
  }
  
  const year = parseInt(hl7DateTime.substring(0, 4));
  const month = parseInt(hl7DateTime.substring(4, 6)) - 1;
  const day = parseInt(hl7DateTime.substring(6, 8));
  const hour = hl7DateTime.length >= 10 ? parseInt(hl7DateTime.substring(8, 10)) : 0;
  const minute = hl7DateTime.length >= 12 ? parseInt(hl7DateTime.substring(10, 12)) : 0;
  const second = hl7DateTime.length >= 14 ? parseInt(hl7DateTime.substring(12, 14)) : 0;
  
  return new Date(year, month, day, hour, minute, second);
}

/**
 * Map HL7 abnormal flags to our internal flag format
 */
export function mapAbnormalFlag(hl7Flag: string): 'normal' | 'low' | 'high' | 'critical-low' | 'critical-high' {
  const flag = hl7Flag.toUpperCase();
  
  switch (flag) {
    case 'L':
      return 'low';
    case 'H':
      return 'high';
    case 'LL':
    case '<':
      return 'critical-low';
    case 'HH':
    case '>':
      return 'critical-high';
    case 'N':
    case '':
    default:
      return 'normal';
  }
}
