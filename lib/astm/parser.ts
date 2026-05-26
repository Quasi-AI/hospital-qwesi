/**
 * ASTM E1381/E1394 Protocol Parser
 * 
 * Parses ASTM (LIS2-A2) messages from laboratory analyzers.
 * 
 * ASTM Control Characters:
 * - ENQ (0x05): Establish link
 * - STX (0x02): Start of frame
 * - ETX (0x03): End of frame (with checksum)
 * - ETB (0x17): End of intermediate frame
 * - ACK (0x06): Positive acknowledgment
 * - NAK (0x15): Negative acknowledgment
 * - EOT (0x04): End of transmission
 * - CR (0x0D): Carriage return (record terminator)
 * - LF (0x0A): Line feed
 * 
 * Record Types:
 * - H: Header Record
 * - P: Patient Record
 * - O: Order Record
 * - R: Result Record
 * - C: Comment Record
 * - L: Terminator Record
 * - Q: Query Record (for bidirectional)
 * - M: Manufacturer Information Record
 */

// ASTM Control Characters
export const ASTM = {
  ENQ: 0x05,
  STX: 0x02,
  ETX: 0x03,
  ETB: 0x17,
  ACK: 0x06,
  NAK: 0x15,
  EOT: 0x04,
  CR: 0x0d,
  LF: 0x0a,
} as const;

// ASTM Record Types
export type ASTMRecordType = 'H' | 'P' | 'O' | 'R' | 'C' | 'L' | 'Q' | 'M';

// Base record interface
export interface ASTMRecord {
  type: ASTMRecordType;
  sequenceNumber: number;
  raw: string;
}

// Header Record (H)
export interface HeaderRecord extends ASTMRecord {
  type: 'H';
  delimiter: string;
  messageControlId: string;
  accessPassword: string;
  senderNameOrId: string;
  senderStreetAddress: string;
  reservedField: string;
  senderPhone: string;
  characteristics: string;
  receiverId: string;
  comment: string;
  processingId: string;
  versionNumber: string;
  dateTime: string;
}

// Patient Record (P)
export interface PatientRecord extends ASTMRecord {
  type: 'P';
  patientId: string;
  patientIdInternal: string;
  patientIdAlternate: string;
  patientName: string;
  motherMaidenName: string;
  birthDate: string;
  sex: string;
  race: string;
  address: string;
  reservedField: string;
  phone: string;
  attendingPhysician: string;
  specialField1: string;
  specialField2: string;
  height: string;
  weight: string;
  diagnosis: string;
  activeMedications: string;
  diet: string;
  practiceField1: string;
  practiceField2: string;
  admissionDate: string;
  admissionStatus: string;
  location: string;
  alternateCode: string;
  religion: string;
  maritalStatus: string;
  isolationStatus: string;
  language: string;
  hospitalService: string;
  hospitalInstitution: string;
  dosageCategory: string;
}

// Order Record (O)
export interface OrderRecord extends ASTMRecord {
  type: 'O';
  specimenId: string;
  instrumentSpecimenId: string;
  universalTestId: string;
  priority: string;
  requestedDateTime: string;
  specimenCollectionDateTime: string;
  collectionEndDateTime: string;
  collectionVolume: string;
  collectorId: string;
  actionCode: string;
  dangerCode: string;
  relevantClinicalInfo: string;
  dateTimeSpecimenReceived: string;
  specimenDescriptor: string;
  orderingPhysician: string;
  physicianPhone: string;
  userField1: string;
  userField2: string;
  laboratoryField1: string;
  laboratoryField2: string;
  dateTimeReported: string;
  instrumentCharge: string;
  instrumentSection: string;
  reportType: string;
  reservedField: string;
  locationOrWard: string;
  infectionOrNosocomial: string;
  specimenService: string;
  specimenInstitution: string;
}

// Result Record (R)
export interface ResultRecord extends ASTMRecord {
  type: 'R';
  universalTestId: string;
  testIdCode: string;
  testIdName: string;
  dataOrMeasurementValue: string;
  units: string;
  referenceRange: string;
  abnormalFlags: string;
  natureOfAbnormality: string;
  resultStatus: string;
  dateOfChangeInNormative: string;
  operatorId: string;
  dateTimeTestStarted: string;
  dateTimeTestCompleted: string;
  instrumentId: string;
}

// Comment Record (C)
export interface CommentRecord extends ASTMRecord {
  type: 'C';
  commentSource: string;
  commentText: string;
  commentType: string;
}

// Terminator Record (L)
export interface TerminatorRecord extends ASTMRecord {
  type: 'L';
  terminatorCode: string;
}

// Query Record (Q)
export interface QueryRecord extends ASTMRecord {
  type: 'Q';
  sequenceNumber: number;
  startingRange: string;
  endingRange: string;
  universalTestId: string;
  natureOfRequestTime: string;
  beginningRequestDateTime: string;
  endingRequestDateTime: string;
  requestingPhysician: string;
  requestingPhysicianPhone: string;
  userField1: string;
  userField2: string;
  requestInformationStatus: string;
}

// Parsed ASTM Message (collection of records)
export interface ASTMMessage {
  header: HeaderRecord;
  patients: {
    patient: PatientRecord;
    orders: {
      order: OrderRecord;
      results: ResultRecord[];
      comments: CommentRecord[];
    }[];
  }[];
  terminator?: TerminatorRecord;
  raw: string;
}

/**
 * Calculate ASTM checksum for a frame
 */
export function calculateChecksum(data: string): string {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data.charCodeAt(i);
  }
  // Add ETX
  sum += ASTM.ETX;
  // Take lower 8 bits and convert to hex
  const checksum = (sum & 0xff).toString(16).toUpperCase().padStart(2, '0');
  return checksum;
}

/**
 * Verify ASTM frame checksum
 */
export function verifyChecksum(frame: string): boolean {
  // Frame format: STX + frame_number + data + ETX + checksum + CR + LF
  // Find ETX position
  const etxPos = frame.indexOf(String.fromCharCode(ASTM.ETX));
  if (etxPos === -1) return false;
  
  // Extract data (from after STX+frame_number to before ETX)
  const stxPos = frame.indexOf(String.fromCharCode(ASTM.STX));
  if (stxPos === -1) return false;
  
  const data = frame.substring(stxPos + 2, etxPos); // +2 to skip STX and frame number
  const frameNumber = frame.charAt(stxPos + 1);
  const expectedChecksum = calculateChecksum(frameNumber + data);
  
  // Extract actual checksum (2 characters after ETX)
  const actualChecksum = frame.substring(etxPos + 1, etxPos + 3).toUpperCase();
  
  return expectedChecksum === actualChecksum;
}

/**
 * Parse a single ASTM record from a string
 */
export function parseRecord(recordString: string): ASTMRecord | null {
  if (!recordString || recordString.length === 0) {
    return null;
  }
  
  // Standard field delimiter is |, component delimiter is ^, repeat delimiter is \
  const delimiter = '|';
  const componentDelimiter = '^';
  
  const fields = recordString.split(delimiter);
  const recordType = fields[0]?.charAt(0) as ASTMRecordType;
  const sequenceNumber = parseInt(fields[0]?.substring(1) || '1') || 1;
  
  switch (recordType) {
    case 'H':
      return parseHeaderRecord(fields, sequenceNumber, recordString);
    case 'P':
      return parsePatientRecord(fields, sequenceNumber, recordString);
    case 'O':
      return parseOrderRecord(fields, sequenceNumber, recordString);
    case 'R':
      return parseResultRecord(fields, sequenceNumber, recordString, componentDelimiter);
    case 'C':
      return parseCommentRecord(fields, sequenceNumber, recordString);
    case 'L':
      return parseTerminatorRecord(fields, sequenceNumber, recordString);
    case 'Q':
      return parseQueryRecord(fields, sequenceNumber, recordString);
    default:
      console.warn(`Unknown ASTM record type: ${recordType}`);
      return {
        type: recordType,
        sequenceNumber,
        raw: recordString,
      };
  }
}

function parseHeaderRecord(fields: string[], seq: number, raw: string): HeaderRecord {
  return {
    type: 'H',
    sequenceNumber: seq,
    raw,
    delimiter: fields[1] || '|\\^&',
    messageControlId: fields[2] || '',
    accessPassword: fields[3] || '',
    senderNameOrId: fields[4] || '',
    senderStreetAddress: fields[5] || '',
    reservedField: fields[6] || '',
    senderPhone: fields[7] || '',
    characteristics: fields[8] || '',
    receiverId: fields[9] || '',
    comment: fields[10] || '',
    processingId: fields[11] || '',
    versionNumber: fields[12] || '',
    dateTime: fields[13] || '',
  };
}

function parsePatientRecord(fields: string[], seq: number, raw: string): PatientRecord {
  return {
    type: 'P',
    sequenceNumber: seq,
    raw,
    patientId: fields[1] || '',
    patientIdInternal: fields[2] || '',
    patientIdAlternate: fields[3] || '',
    patientName: fields[4] || '',
    motherMaidenName: fields[5] || '',
    birthDate: fields[6] || '',
    sex: fields[7] || '',
    race: fields[8] || '',
    address: fields[9] || '',
    reservedField: fields[10] || '',
    phone: fields[11] || '',
    attendingPhysician: fields[12] || '',
    specialField1: fields[13] || '',
    specialField2: fields[14] || '',
    height: fields[15] || '',
    weight: fields[16] || '',
    diagnosis: fields[17] || '',
    activeMedications: fields[18] || '',
    diet: fields[19] || '',
    practiceField1: fields[20] || '',
    practiceField2: fields[21] || '',
    admissionDate: fields[22] || '',
    admissionStatus: fields[23] || '',
    location: fields[24] || '',
    alternateCode: fields[25] || '',
    religion: fields[26] || '',
    maritalStatus: fields[27] || '',
    isolationStatus: fields[28] || '',
    language: fields[29] || '',
    hospitalService: fields[30] || '',
    hospitalInstitution: fields[31] || '',
    dosageCategory: fields[32] || '',
  };
}

function parseOrderRecord(fields: string[], seq: number, raw: string): OrderRecord {
  return {
    type: 'O',
    sequenceNumber: seq,
    raw,
    specimenId: fields[1] || '',
    instrumentSpecimenId: fields[2] || '',
    universalTestId: fields[3] || '',
    priority: fields[4] || '',
    requestedDateTime: fields[5] || '',
    specimenCollectionDateTime: fields[6] || '',
    collectionEndDateTime: fields[7] || '',
    collectionVolume: fields[8] || '',
    collectorId: fields[9] || '',
    actionCode: fields[10] || '',
    dangerCode: fields[11] || '',
    relevantClinicalInfo: fields[12] || '',
    dateTimeSpecimenReceived: fields[13] || '',
    specimenDescriptor: fields[14] || '',
    orderingPhysician: fields[15] || '',
    physicianPhone: fields[16] || '',
    userField1: fields[17] || '',
    userField2: fields[18] || '',
    laboratoryField1: fields[19] || '',
    laboratoryField2: fields[20] || '',
    dateTimeReported: fields[21] || '',
    instrumentCharge: fields[22] || '',
    instrumentSection: fields[23] || '',
    reportType: fields[24] || '',
    reservedField: fields[25] || '',
    locationOrWard: fields[26] || '',
    infectionOrNosocomial: fields[27] || '',
    specimenService: fields[28] || '',
    specimenInstitution: fields[29] || '',
  };
}

function parseResultRecord(
  fields: string[],
  seq: number,
  raw: string,
  componentDelimiter: string
): ResultRecord {
  // Universal test ID may have components: code^name^coding_system
  const testIdParts = (fields[2] || '').split(componentDelimiter);
  
  return {
    type: 'R',
    sequenceNumber: seq,
    raw,
    universalTestId: fields[2] || '',
    testIdCode: testIdParts[0] || '',
    testIdName: testIdParts[1] || testIdParts[0] || '',
    dataOrMeasurementValue: fields[3] || '',
    units: fields[4] || '',
    referenceRange: fields[5] || '',
    abnormalFlags: fields[6] || '',
    natureOfAbnormality: fields[7] || '',
    resultStatus: fields[8] || '',
    dateOfChangeInNormative: fields[9] || '',
    operatorId: fields[10] || '',
    dateTimeTestStarted: fields[11] || '',
    dateTimeTestCompleted: fields[12] || '',
    instrumentId: fields[13] || '',
  };
}

function parseCommentRecord(fields: string[], seq: number, raw: string): CommentRecord {
  return {
    type: 'C',
    sequenceNumber: seq,
    raw,
    commentSource: fields[1] || '',
    commentText: fields[2] || '',
    commentType: fields[3] || '',
  };
}

function parseTerminatorRecord(fields: string[], seq: number, raw: string): TerminatorRecord {
  return {
    type: 'L',
    sequenceNumber: seq,
    raw,
    terminatorCode: fields[1] || 'N',
  };
}

function parseQueryRecord(fields: string[], seq: number, raw: string): QueryRecord {
  return {
    type: 'Q',
    sequenceNumber: seq,
    raw,
    startingRange: fields[1] || '',
    endingRange: fields[2] || '',
    universalTestId: fields[3] || '',
    natureOfRequestTime: fields[4] || '',
    beginningRequestDateTime: fields[5] || '',
    endingRequestDateTime: fields[6] || '',
    requestingPhysician: fields[7] || '',
    requestingPhysicianPhone: fields[8] || '',
    userField1: fields[9] || '',
    userField2: fields[10] || '',
    requestInformationStatus: fields[11] || '',
  };
}

/**
 * Parse multiple ASTM records from a message
 */
export function parseASTMMessage(rawMessage: string): ASTMMessage {
  // Split by CR or CRLF
  const lines = rawMessage
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  // Parse all records
  const records: ASTMRecord[] = [];
  for (const line of lines) {
    // Remove frame control characters if present
    let cleanLine = line;
    
    // Remove STX if present
    if (cleanLine.charCodeAt(0) === ASTM.STX) {
      cleanLine = cleanLine.substring(2); // Skip STX and frame number
    }
    
    // Remove ETX and checksum if present
    const etxIndex = cleanLine.indexOf(String.fromCharCode(ASTM.ETX));
    if (etxIndex !== -1) {
      cleanLine = cleanLine.substring(0, etxIndex);
    }
    
    // Remove ETB if present (intermediate frame end)
    const etbIndex = cleanLine.indexOf(String.fromCharCode(ASTM.ETB));
    if (etbIndex !== -1) {
      cleanLine = cleanLine.substring(0, etbIndex);
    }
    
    const record = parseRecord(cleanLine);
    if (record) {
      records.push(record);
    }
  }
  
  // Build structured message
  let header: HeaderRecord | undefined;
  const patients: ASTMMessage['patients'] = [];
  let currentPatient: ASTMMessage['patients'][0] | null = null;
  let currentOrder: ASTMMessage['patients'][0]['orders'][0] | null = null;
  let terminator: TerminatorRecord | undefined;
  
  for (const record of records) {
    switch (record.type) {
      case 'H':
        header = record as HeaderRecord;
        break;
        
      case 'P':
        if (currentPatient && currentOrder) {
          // Save current patient before starting new one
        }
        currentPatient = {
          patient: record as PatientRecord,
          orders: [],
        };
        patients.push(currentPatient);
        currentOrder = null;
        break;
        
      case 'O':
        if (!currentPatient) {
          // Create anonymous patient
          currentPatient = {
            patient: {
              type: 'P',
              sequenceNumber: 1,
              raw: '',
              patientId: '',
              patientIdInternal: '',
              patientIdAlternate: '',
              patientName: 'Unknown',
              motherMaidenName: '',
              birthDate: '',
              sex: '',
              race: '',
              address: '',
              reservedField: '',
              phone: '',
              attendingPhysician: '',
              specialField1: '',
              specialField2: '',
              height: '',
              weight: '',
              diagnosis: '',
              activeMedications: '',
              diet: '',
              practiceField1: '',
              practiceField2: '',
              admissionDate: '',
              admissionStatus: '',
              location: '',
              alternateCode: '',
              religion: '',
              maritalStatus: '',
              isolationStatus: '',
              language: '',
              hospitalService: '',
              hospitalInstitution: '',
              dosageCategory: '',
            },
            orders: [],
          };
          patients.push(currentPatient);
        }
        currentOrder = {
          order: record as OrderRecord,
          results: [],
          comments: [],
        };
        currentPatient.orders.push(currentOrder);
        break;
        
      case 'R':
        if (currentOrder) {
          currentOrder.results.push(record as ResultRecord);
        }
        break;
        
      case 'C':
        if (currentOrder) {
          currentOrder.comments.push(record as CommentRecord);
        }
        break;
        
      case 'L':
        terminator = record as TerminatorRecord;
        break;
    }
  }
  
  if (!header) {
    throw new Error('ASTM message missing Header record');
  }
  
  return {
    header,
    patients,
    terminator,
    raw: rawMessage,
  };
}

/**
 * Parse ASTM date/time format to Date object
 * Format: YYYYMMDDHHMMSS
 */
export function parseASTMDateTime(astmDateTime: string): Date | null {
  if (!astmDateTime || astmDateTime.length < 8) {
    return null;
  }
  
  const year = parseInt(astmDateTime.substring(0, 4));
  const month = parseInt(astmDateTime.substring(4, 6)) - 1;
  const day = parseInt(astmDateTime.substring(6, 8));
  const hour = astmDateTime.length >= 10 ? parseInt(astmDateTime.substring(8, 10)) : 0;
  const minute = astmDateTime.length >= 12 ? parseInt(astmDateTime.substring(10, 12)) : 0;
  const second = astmDateTime.length >= 14 ? parseInt(astmDateTime.substring(12, 14)) : 0;
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return null;
  }
  
  return new Date(year, month, day, hour, minute, second);
}

/**
 * Map ASTM abnormal flags to internal format
 */
export function mapASTMAbnormalFlag(flag: string): 'normal' | 'low' | 'high' | 'critical-low' | 'critical-high' {
  const upperFlag = (flag || '').toUpperCase();
  
  switch (upperFlag) {
    case 'L':
    case '<':
      return 'low';
    case 'H':
    case '>':
      return 'high';
    case 'LL':
    case '<<':
      return 'critical-low';
    case 'HH':
    case '>>':
      return 'critical-high';
    case 'N':
    case '':
    default:
      return 'normal';
  }
}
