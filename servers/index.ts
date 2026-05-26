/**
 * Protocol Server Orchestrator
 * 
 * Starts and manages all protocol servers (HL7, ASTM).
 * FHIR is handled via Next.js API routes.
 */

import * as net from 'net';
import { config } from 'dotenv';

// Load environment variables
config();

import { startHL7Server, stopHL7Server } from './hl7-server';
import { startASTMServer, stopASTMServer } from './astm-server';
import { getConfig, validateConfig, printConfigSummary } from '../lib/protocols/config';

// Server instances
let hl7Server: net.Server | null = null;
let astmServer: net.Server | null = null;

// Graceful shutdown flag
let isShuttingDown = false;

/**
 * Start all enabled protocol servers
 */
async function startServers(): Promise<void> {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     Medical Device Protocol Servers                  ║');
  console.log('║     HMS Lab Integration Suite                        ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
  
  // Get and validate configuration
  const protocolConfig = getConfig();
  const validation = validateConfig(protocolConfig);
  
  if (!validation.valid) {
    console.error('Configuration errors:');
    validation.errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }
  
  // Print configuration summary
  printConfigSummary(protocolConfig);
  
  // Check if servers are enabled
  const serversEnabled = process.env.PROTOCOL_SERVERS_ENABLED !== 'false';
  
  if (!serversEnabled) {
    console.log('Protocol servers are disabled (PROTOCOL_SERVERS_ENABLED=false)');
    console.log('Set PROTOCOL_SERVERS_ENABLED=true to enable servers');
    return;
  }
  
  // Start HL7 server
  if (protocolConfig.hl7.enabled) {
    try {
      console.log('[Orchestrator] Starting HL7 v2 server...');
      hl7Server = await startHL7Server();
      console.log(`[Orchestrator] HL7 server started on port ${protocolConfig.hl7.port}`);
    } catch (error) {
      console.error('[Orchestrator] Failed to start HL7 server:', error);
    }
  } else {
    console.log('[Orchestrator] HL7 server disabled');
  }
  
  // Start ASTM server
  if (protocolConfig.astm.enabled) {
    try {
      console.log('[Orchestrator] Starting ASTM E1381 server...');
      astmServer = await startASTMServer();
      console.log(`[Orchestrator] ASTM server started on port ${protocolConfig.astm.port}`);
    } catch (error) {
      console.error('[Orchestrator] Failed to start ASTM server:', error);
    }
  } else {
    console.log('[Orchestrator] ASTM server disabled');
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('All protocol servers started successfully');
  console.log('');
  console.log('Listening for connections from lab analyzers...');
  console.log('');
  console.log('Press Ctrl+C to stop servers');
  console.log('═══════════════════════════════════════════════════════');
}

/**
 * Stop all protocol servers
 */
async function stopServers(): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  
  console.log('');
  console.log('[Orchestrator] Shutting down protocol servers...');
  
  const shutdownPromises: Promise<void>[] = [];
  
  if (hl7Server) {
    shutdownPromises.push(stopHL7Server(hl7Server));
  }
  
  if (astmServer) {
    shutdownPromises.push(stopASTMServer(astmServer));
  }
  
  await Promise.all(shutdownPromises);
  
  console.log('[Orchestrator] All servers stopped');
}

/**
 * Setup signal handlers for graceful shutdown
 */
function setupSignalHandlers(): void {
  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    console.log('\n[Orchestrator] Received SIGINT, shutting down...');
    await stopServers();
    process.exit(0);
  });
  
  // Handle SIGTERM
  process.on('SIGTERM', async () => {
    console.log('\n[Orchestrator] Received SIGTERM, shutting down...');
    await stopServers();
    process.exit(0);
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error('[Orchestrator] Uncaught exception:', error);
    await stopServers();
    process.exit(1);
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason, promise) => {
    console.error('[Orchestrator] Unhandled promise rejection:', reason);
    await stopServers();
    process.exit(1);
  });
}

// Main entry point
async function main(): Promise<void> {
  setupSignalHandlers();
  
  try {
    await startServers();
  } catch (error) {
    console.error('[Orchestrator] Failed to start servers:', error);
    process.exit(1);
  }
}

// Run
main();
