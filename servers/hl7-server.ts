/**
 * HL7 v2 TCP Server with MLLP (Minimal Lower Layer Protocol) Framing
 * 
 * Listens for HL7 v2 messages from lab analyzers and middleware systems.
 * Supports ORU^R01 (Observation Results) messages.
 * 
 * MLLP Framing:
 * - Start Block: 0x0B (VT - Vertical Tab)
 * - End Block: 0x1C (FS - File Separator) + 0x0D (CR - Carriage Return)
 */

import * as net from 'net';
import * as crypto from 'crypto';
import { config } from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
config();

import { parseHL7Message, buildACK, HL7Message } from '../lib/hl7/parser';
import {
  processORUMessage,
  validateORUMessage,
  convertToDeviceResultInput,
  extractDeviceIdentifier,
} from '../lib/hl7/oru-handler';

// MLLP Control Characters
const MLLP_START_BLOCK = Buffer.from([0x0b]); // VT
const MLLP_END_BLOCK = Buffer.from([0x1c, 0x0d]); // FS + CR

// Server configuration
const HL7_PORT = parseInt(process.env.HL7_SERVER_PORT || '2575');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-doc';

// Connection state
interface ConnectionState {
  buffer: Buffer;
  deviceId?: string;
  messagesReceived: number;
}

const connections = new Map<string, ConnectionState>();

/**
 * Process a complete HL7 message
 */
async function processMessage(
  message: string,
  socket: net.Socket,
  connectionId: string
): Promise<void> {
  console.log(`[HL7] Processing message from ${connectionId}`);
  
  let parsedMessage: HL7Message;
  
  try {
    // Parse the HL7 message
    parsedMessage = parseHL7Message(message);
    console.log(`[HL7] Message type: ${parsedMessage.messageType}`);
    console.log(`[HL7] Control ID: ${parsedMessage.messageControlId}`);
    console.log(`[HL7] From: ${parsedMessage.sendingApplication}/${parsedMessage.sendingFacility}`);
  } catch (error) {
    console.error('[HL7] Failed to parse message:', error);
    // Send negative acknowledgment
    const nak = buildNAK(message, 'Parse error: ' + (error as Error).message);
    sendMLLPMessage(socket, nak);
    return;
  }
  
  try {
    // Handle based on message type
    if (parsedMessage.messageType.startsWith('ORU')) {
      await handleORUMessage(parsedMessage, message, socket);
    } else {
      console.log(`[HL7] Unsupported message type: ${parsedMessage.messageType}`);
      const ack = buildACK(parsedMessage, 'AR', `Unsupported message type: ${parsedMessage.messageType}`);
      sendMLLPMessage(socket, ack);
    }
  } catch (error) {
    console.error('[HL7] Error processing message:', error);
    const ack = buildACK(parsedMessage, 'AE', 'Processing error: ' + (error as Error).message);
    sendMLLPMessage(socket, ack);
  }
}

/**
 * Handle ORU^R01 message (Observation Results)
 */
async function handleORUMessage(
  parsedMessage: HL7Message,
  rawMessage: string,
  socket: net.Socket
): Promise<void> {
  // Validate the message
  const validation = validateORUMessage(parsedMessage);
  if (!validation.valid) {
    console.error('[HL7] Invalid ORU message:', validation.errors);
    const ack = buildACK(parsedMessage, 'AE', validation.errors.join('; '));
    sendMLLPMessage(socket, ack);
    return;
  }
  
  // Extract device identifier
  const deviceIdentifier = extractDeviceIdentifier(parsedMessage);
  console.log(`[HL7] Device identifier: ${deviceIdentifier}`);
  
  // Find the device in database
  const LabDevice = mongoose.models.LabDevice || (await import('../models/LabDevice')).default;
  const DeviceResult = mongoose.models.DeviceResult || (await import('../models/DeviceResult')).default;
  const LabTest = mongoose.models.LabTest || (await import('../models/LabTest')).default;
  
  // Try to find device by sending application/facility
  let device = await LabDevice.findOne({
    $or: [
      { deviceCode: deviceIdentifier },
      { deviceCode: parsedMessage.sendingApplication?.toUpperCase() },
      { name: { $regex: parsedMessage.sendingApplication, $options: 'i' } },
    ],
    isActive: true,
  });
  
  if (!device) {
    console.warn(`[HL7] Unknown device: ${deviceIdentifier}`);
    // Still process the message but log warning
    // In production, you might want to reject unknown devices
  }
  
  // Process the ORU message
  const oruResults = processORUMessage(parsedMessage);
  console.log(`[HL7] Extracted ${oruResults.length} result set(s)`);
  
  let processedCount = 0;
  let errorCount = 0;
  
  for (const oruResult of oruResults) {
    try {
      // Convert to DeviceResult format
      const input = convertToDeviceResultInput(oruResult, rawMessage);
      
      // Map results using device parameter mappings if available
      const mappedResults = input.results.map(r => {
        const mapping = device?.parameterMappings?.find(
          (m: any) => m.deviceCode?.toUpperCase() === r.code?.toUpperCase()
        );
        
        const unit = r.unit || mapping?.unit || '';
        const normalRange = mapping?.normalRange || '';
        
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
      
      // Create DeviceResult record
      const deviceResult = new DeviceResult({
        deviceId: device?._id || 'HL7_' + deviceIdentifier,
        deviceCode: device?.deviceCode || deviceIdentifier,
        deviceName: device?.name || `HL7 Device (${deviceIdentifier})`,
        receivedAt: new Date(),
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
        rawPayload: JSON.stringify({
          protocol: 'HL7',
          messageType: parsedMessage.messageType,
          messageControlId: parsedMessage.messageControlId,
          rawMessage: rawMessage.substring(0, 10000), // Limit size
        }),
      });
      
      await deviceResult.save();
      console.log(`[HL7] Created DeviceResult: ${deviceResult.resultNumber}`);
      
      // Update device stats if we have a device
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
      
      processedCount++;
    } catch (error) {
      console.error('[HL7] Error processing result:', error);
      errorCount++;
    }
  }
  
  // Send acknowledgment
  if (errorCount === 0) {
    const ack = buildACK(parsedMessage, 'AA');
    sendMLLPMessage(socket, ack);
    console.log(`[HL7] Sent ACK (AA) - processed ${processedCount} result(s)`);
  } else if (processedCount > 0) {
    const ack = buildACK(parsedMessage, 'AA', `Processed ${processedCount}, errors: ${errorCount}`);
    sendMLLPMessage(socket, ack);
    console.log(`[HL7] Sent ACK (AA) with warnings`);
  } else {
    const ack = buildACK(parsedMessage, 'AE', 'All results failed to process');
    sendMLLPMessage(socket, ack);
    console.log(`[HL7] Sent ACK (AE) - all failed`);
  }
}

/**
 * Build a NAK response for unparseable messages
 */
function buildNAK(rawMessage: string, errorMessage: string): string {
  const now = new Date();
  const timestamp = formatTimestamp(now);
  
  const msh = [
    'MSH',
    '^~\\&',
    'HMS',
    'HOSPITAL',
    '',
    '',
    timestamp,
    '',
    'ACK',
    `NAK${Date.now()}`,
    'P',
    '2.5',
  ].join('|');
  
  const msa = [
    'MSA',
    'AR', // Application Reject
    '',
    errorMessage,
  ].join('|');
  
  return msh + '\r' + msa;
}

/**
 * Format timestamp for HL7
 */
function formatTimestamp(date: Date): string {
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
 * Send an MLLP-wrapped message
 */
function sendMLLPMessage(socket: net.Socket, message: string): void {
  const mllpMessage = Buffer.concat([
    MLLP_START_BLOCK,
    Buffer.from(message, 'utf8'),
    MLLP_END_BLOCK,
  ]);
  socket.write(mllpMessage);
}

/**
 * Extract complete messages from buffer
 */
function extractMessages(buffer: Buffer): { messages: string[]; remaining: Buffer } {
  const messages: string[] = [];
  let remaining = buffer;
  
  while (true) {
    // Find start block
    const startIndex = remaining.indexOf(MLLP_START_BLOCK[0]);
    if (startIndex === -1) {
      remaining = Buffer.alloc(0);
      break;
    }
    
    // Find end block (FS + CR)
    let endIndex = -1;
    for (let i = startIndex + 1; i < remaining.length - 1; i++) {
      if (remaining[i] === 0x1c && remaining[i + 1] === 0x0d) {
        endIndex = i;
        break;
      }
    }
    
    if (endIndex === -1) {
      // Incomplete message, keep in buffer
      remaining = remaining.slice(startIndex);
      break;
    }
    
    // Extract message (without MLLP framing)
    const message = remaining.slice(startIndex + 1, endIndex).toString('utf8');
    messages.push(message);
    
    // Continue with rest of buffer
    remaining = remaining.slice(endIndex + 2);
  }
  
  return { messages, remaining };
}

/**
 * Start the HL7 server
 */
export async function startHL7Server(): Promise<net.Server> {
  // Connect to MongoDB
  if (mongoose.connection.readyState === 0) {
    console.log('[HL7] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('[HL7] Connected to MongoDB');
  }
  
  const server = net.createServer((socket) => {
    const connectionId = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`[HL7] New connection from ${connectionId}`);
    
    // Initialize connection state
    connections.set(connectionId, {
      buffer: Buffer.alloc(0),
      messagesReceived: 0,
    });
    
    socket.on('data', async (data) => {
      const state = connections.get(connectionId)!;
      
      // Append to buffer
      state.buffer = Buffer.concat([state.buffer, data]);
      
      // Extract complete messages
      const { messages, remaining } = extractMessages(state.buffer);
      state.buffer = remaining;
      
      // Process each complete message
      for (const message of messages) {
        state.messagesReceived++;
        await processMessage(message, socket, connectionId);
      }
    });
    
    socket.on('close', () => {
      console.log(`[HL7] Connection closed: ${connectionId}`);
      connections.delete(connectionId);
    });
    
    socket.on('error', (err) => {
      console.error(`[HL7] Socket error (${connectionId}):`, err.message);
      connections.delete(connectionId);
    });
    
    // Set timeout (5 minutes)
    socket.setTimeout(5 * 60 * 1000);
    socket.on('timeout', () => {
      console.log(`[HL7] Connection timeout: ${connectionId}`);
      socket.end();
    });
  });
  
  server.on('error', (err) => {
    console.error('[HL7] Server error:', err);
  });
  
  return new Promise((resolve) => {
    server.listen(HL7_PORT, () => {
      console.log(`[HL7] Server listening on port ${HL7_PORT}`);
      console.log(`[HL7] Ready to receive HL7 v2 messages via MLLP`);
      resolve(server);
    });
  });
}

/**
 * Stop the HL7 server
 */
export function stopHL7Server(server: net.Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => {
      console.log('[HL7] Server stopped');
      resolve();
    });
  });
}

// Run if executed directly
if (require.main === module) {
  startHL7Server().catch(console.error);
}
