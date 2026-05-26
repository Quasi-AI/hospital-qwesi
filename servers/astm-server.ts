/**
 * ASTM E1381/E1394 TCP Server
 * 
 * Listens for ASTM protocol messages from lab analyzers.
 * Implements the low-level protocol handshaking (ENQ, ACK, NAK, EOT).
 * 
 * Protocol Flow:
 * 1. Analyzer sends ENQ (Establish Link)
 * 2. Server responds with ACK (Ready to receive)
 * 3. Analyzer sends frames (STX + data + ETX/ETB + checksum + CR LF)
 * 4. Server responds with ACK for each frame
 * 5. Analyzer sends EOT (End of Transmission)
 */

import * as net from 'net';
import { config } from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
config();

import {
  ASTM,
  parseASTMMessage,
  calculateChecksum,
  ASTMMessage,
} from '../lib/astm/parser';
import {
  processASTMMessage,
  validateASTMMessage,
  convertToDeviceResultInput,
  extractDeviceIdentifier,
  getMessageStats,
} from '../lib/astm/result-handler';

// Server configuration
const ASTM_PORT = parseInt(process.env.ASTM_SERVER_PORT || '5000');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-doc';

// Connection states
type ConnectionPhase = 'idle' | 'receiving' | 'sending';

interface ConnectionState {
  phase: ConnectionPhase;
  frames: string[];
  currentFrame: string;
  expectedFrameNumber: number;
  messagesReceived: number;
  deviceId?: string;
}

const connections = new Map<string, ConnectionState>();

/**
 * Process a complete ASTM message (all frames combined)
 */
async function processCompleteMessage(
  frames: string[],
  socket: net.Socket,
  connectionId: string
): Promise<void> {
  console.log(`[ASTM] Processing message from ${connectionId} (${frames.length} frames)`);
  
  // Combine all frames into a single message
  const rawMessage = frames.join('\r');
  
  let parsedMessage: ASTMMessage;
  
  try {
    parsedMessage = parseASTMMessage(rawMessage);
    const stats = getMessageStats(parsedMessage);
    console.log(`[ASTM] Parsed message: ${stats.patientCount} patients, ${stats.orderCount} orders, ${stats.resultCount} results`);
    console.log(`[ASTM] Sender: ${parsedMessage.header.senderNameOrId}`);
  } catch (error) {
    console.error('[ASTM] Failed to parse message:', error);
    return;
  }
  
  try {
    // Validate message
    const validation = validateASTMMessage(parsedMessage);
    if (!validation.valid) {
      console.error('[ASTM] Invalid message:', validation.errors);
      return;
    }
    
    // Process results
    await handleASTMResults(parsedMessage, rawMessage, connectionId);
  } catch (error) {
    console.error('[ASTM] Error processing message:', error);
  }
}

/**
 * Handle ASTM results and save to database
 */
async function handleASTMResults(
  parsedMessage: ASTMMessage,
  rawMessage: string,
  connectionId: string
): Promise<void> {
  // Extract device identifier
  const deviceIdentifier = extractDeviceIdentifier(parsedMessage.header);
  console.log(`[ASTM] Device identifier: ${deviceIdentifier}`);
  
  // Import models
  const LabDevice = mongoose.models.LabDevice || (await import('../models/LabDevice')).default;
  const DeviceResult = mongoose.models.DeviceResult || (await import('../models/DeviceResult')).default;
  const LabTest = mongoose.models.LabTest || (await import('../models/LabTest')).default;
  
  // Find device in database
  let device = await LabDevice.findOne({
    $or: [
      { deviceCode: deviceIdentifier },
      { deviceCode: parsedMessage.header.senderNameOrId?.toUpperCase() },
      { name: { $regex: parsedMessage.header.senderNameOrId || '', $options: 'i' } },
    ],
    isActive: true,
  });
  
  if (!device) {
    console.warn(`[ASTM] Unknown device: ${deviceIdentifier}`);
  }
  
  // Extract results from message
  const astmResults = processASTMMessage(parsedMessage);
  console.log(`[ASTM] Extracted ${astmResults.length} result set(s)`);
  
  let processedCount = 0;
  let errorCount = 0;
  
  for (const astmResult of astmResults) {
    try {
      // Convert to DeviceResult format
      const input = convertToDeviceResultInput(astmResult, rawMessage);
      
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
        deviceId: device?._id || 'ASTM_' + deviceIdentifier,
        deviceCode: device?.deviceCode || deviceIdentifier,
        deviceName: device?.name || `ASTM Device (${deviceIdentifier})`,
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
          protocol: 'ASTM',
          senderNameOrId: parsedMessage.header.senderNameOrId,
          messageDateTime: parsedMessage.header.dateTime,
          rawMessage: rawMessage.substring(0, 10000),
        }),
      });
      
      await deviceResult.save();
      console.log(`[ASTM] Created DeviceResult: ${deviceResult.resultNumber}`);
      
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
      console.error('[ASTM] Error processing result:', error);
      errorCount++;
    }
  }
  
  console.log(`[ASTM] Processed ${processedCount} result(s), ${errorCount} error(s)`);
}

/**
 * Handle incoming data from ASTM device
 */
function handleData(
  data: Buffer,
  socket: net.Socket,
  connectionId: string
): void {
  const state = connections.get(connectionId)!;
  
  // Process each byte
  for (let i = 0; i < data.length; i++) {
    const byte = data[i];
    
    switch (byte) {
      case ASTM.ENQ:
        // Establish link request
        console.log(`[ASTM] ENQ received from ${connectionId}`);
        if (state.phase === 'idle') {
          state.phase = 'receiving';
          state.frames = [];
          state.currentFrame = '';
          state.expectedFrameNumber = 1;
          // Send ACK
          socket.write(Buffer.from([ASTM.ACK]));
          console.log(`[ASTM] Sent ACK (ready to receive)`);
        } else {
          // Busy, send NAK
          socket.write(Buffer.from([ASTM.NAK]));
          console.log(`[ASTM] Sent NAK (busy)`);
        }
        break;
        
      case ASTM.EOT:
        // End of transmission
        console.log(`[ASTM] EOT received from ${connectionId}`);
        if (state.phase === 'receiving' && state.frames.length > 0) {
          // Process complete message
          processCompleteMessage(state.frames, socket, connectionId);
        }
        // Reset state
        state.phase = 'idle';
        state.frames = [];
        state.currentFrame = '';
        state.expectedFrameNumber = 1;
        break;
        
      case ASTM.STX:
        // Start of frame
        state.currentFrame = '';
        break;
        
      case ASTM.ETX:
      case ASTM.ETB:
        // End of frame (ETX) or intermediate frame (ETB)
        // Next two bytes are checksum
        const checksum = data.slice(i + 1, i + 3).toString('ascii');
        i += 2; // Skip checksum
        
        // Verify checksum
        const frameNumber = state.currentFrame.charAt(0);
        const frameData = state.currentFrame.substring(1);
        const expectedChecksum = calculateChecksum(state.currentFrame);
        
        if (checksum.toUpperCase() === expectedChecksum.toUpperCase()) {
          // Valid frame
          console.log(`[ASTM] Frame ${frameNumber} received (${frameData.length} chars)`);
          
          // Parse records from frame
          const records = frameData.split('\r').filter(r => r.trim());
          state.frames.push(...records);
          
          // Send ACK
          socket.write(Buffer.from([ASTM.ACK]));
          console.log(`[ASTM] Sent ACK for frame ${frameNumber}`);
        } else {
          // Invalid checksum
          console.error(`[ASTM] Checksum mismatch: expected ${expectedChecksum}, got ${checksum}`);
          // Send NAK to request retransmission
          socket.write(Buffer.from([ASTM.NAK]));
          console.log(`[ASTM] Sent NAK (checksum error)`);
        }
        
        state.currentFrame = '';
        break;
        
      case ASTM.CR:
      case ASTM.LF:
        // Ignore line endings (handled within frames)
        break;
        
      default:
        // Accumulate data in current frame
        if (state.phase === 'receiving') {
          state.currentFrame += String.fromCharCode(byte);
        }
        break;
    }
  }
}

/**
 * Start the ASTM server
 */
export async function startASTMServer(): Promise<net.Server> {
  // Connect to MongoDB
  if (mongoose.connection.readyState === 0) {
    console.log('[ASTM] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('[ASTM] Connected to MongoDB');
  }
  
  const server = net.createServer((socket) => {
    const connectionId = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`[ASTM] New connection from ${connectionId}`);
    
    // Initialize connection state
    connections.set(connectionId, {
      phase: 'idle',
      frames: [],
      currentFrame: '',
      expectedFrameNumber: 1,
      messagesReceived: 0,
    });
    
    socket.on('data', (data) => {
      handleData(data, socket, connectionId);
    });
    
    socket.on('close', () => {
      console.log(`[ASTM] Connection closed: ${connectionId}`);
      connections.delete(connectionId);
    });
    
    socket.on('error', (err) => {
      console.error(`[ASTM] Socket error (${connectionId}):`, err.message);
      connections.delete(connectionId);
    });
    
    // Set timeout (5 minutes)
    socket.setTimeout(5 * 60 * 1000);
    socket.on('timeout', () => {
      console.log(`[ASTM] Connection timeout: ${connectionId}`);
      socket.end();
    });
  });
  
  server.on('error', (err) => {
    console.error('[ASTM] Server error:', err);
  });
  
  return new Promise((resolve) => {
    server.listen(ASTM_PORT, () => {
      console.log(`[ASTM] Server listening on port ${ASTM_PORT}`);
      console.log(`[ASTM] Ready to receive ASTM E1381/E1394 messages`);
      resolve(server);
    });
  });
}

/**
 * Stop the ASTM server
 */
export function stopASTMServer(server: net.Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => {
      console.log('[ASTM] Server stopped');
      resolve();
    });
  });
}

// Run if executed directly
if (require.main === module) {
  startASTMServer().catch(console.error);
}
