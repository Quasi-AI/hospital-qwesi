/**
 * Protocol Server Configuration
 * 
 * Configuration settings for HL7, ASTM, and FHIR protocol servers.
 */

// Default ports
export const DEFAULT_PORTS = {
  HL7: 2575,    // Standard HL7 MLLP port
  ASTM: 5000,   // Common ASTM port
  FHIR: 3000,   // Next.js handles FHIR via HTTP on the same port
} as const;

// Protocol configuration
export interface ProtocolConfig {
  hl7: HL7Config;
  astm: ASTMConfig;
  fhir: FHIRConfig;
}

export interface HL7Config {
  enabled: boolean;
  port: number;
  host: string;
  timeout: number; // Connection timeout in ms
  maxConnections: number;
  
  // MLLP settings
  mllp: {
    startBlock: number; // 0x0B
    endBlock: number[];  // [0x1C, 0x0D]
    timeout: number;    // Message timeout
  };
  
  // Processing settings
  autoAck: boolean; // Automatically acknowledge messages
  supportedMessageTypes: string[];
}

export interface ASTMConfig {
  enabled: boolean;
  port: number;
  host: string;
  timeout: number;
  maxConnections: number;
  
  // Protocol settings
  frameTimeout: number; // Time to wait for frames
  retryCount: number;   // NAK retry count
  checksumEnabled: boolean;
}

export interface FHIRConfig {
  enabled: boolean;
  basePath: string;
  version: string;
  
  // Supported resources
  supportedResources: string[];
  
  // Content types
  contentTypes: string[];
}

/**
 * Get configuration from environment variables
 */
export function getConfig(): ProtocolConfig {
  return {
    hl7: {
      enabled: process.env.HL7_SERVER_ENABLED !== 'false',
      port: parseInt(process.env.HL7_SERVER_PORT || String(DEFAULT_PORTS.HL7)),
      host: process.env.HL7_SERVER_HOST || '0.0.0.0',
      timeout: parseInt(process.env.HL7_CONNECTION_TIMEOUT || '300000'), // 5 minutes
      maxConnections: parseInt(process.env.HL7_MAX_CONNECTIONS || '100'),
      
      mllp: {
        startBlock: 0x0b,
        endBlock: [0x1c, 0x0d],
        timeout: parseInt(process.env.HL7_MESSAGE_TIMEOUT || '30000'), // 30 seconds
      },
      
      autoAck: process.env.HL7_AUTO_ACK !== 'false',
      supportedMessageTypes: [
        'ORU^R01', // Observation Results
        'ORM^O01', // Order Message (for bidirectional)
        'ADT^A01', // Patient Admit
        'ADT^A04', // Patient Register
      ],
    },
    
    astm: {
      enabled: process.env.ASTM_SERVER_ENABLED !== 'false',
      port: parseInt(process.env.ASTM_SERVER_PORT || String(DEFAULT_PORTS.ASTM)),
      host: process.env.ASTM_SERVER_HOST || '0.0.0.0',
      timeout: parseInt(process.env.ASTM_CONNECTION_TIMEOUT || '300000'), // 5 minutes
      maxConnections: parseInt(process.env.ASTM_MAX_CONNECTIONS || '50'),
      
      frameTimeout: parseInt(process.env.ASTM_FRAME_TIMEOUT || '15000'), // 15 seconds
      retryCount: parseInt(process.env.ASTM_RETRY_COUNT || '3'),
      checksumEnabled: process.env.ASTM_CHECKSUM_ENABLED !== 'false',
    },
    
    fhir: {
      enabled: true, // Always enabled via Next.js API
      basePath: '/api/fhir',
      version: 'R4',
      
      supportedResources: [
        'DiagnosticReport',
        'Observation',
        'Bundle',
        'Patient',
        'Specimen',
        'ServiceRequest',
      ],
      
      contentTypes: [
        'application/fhir+json',
        'application/json',
      ],
    },
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: ProtocolConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate HL7 config
  if (config.hl7.enabled) {
    if (config.hl7.port < 1 || config.hl7.port > 65535) {
      errors.push(`Invalid HL7 port: ${config.hl7.port}`);
    }
    if (config.hl7.timeout < 1000) {
      errors.push('HL7 timeout should be at least 1000ms');
    }
  }
  
  // Validate ASTM config
  if (config.astm.enabled) {
    if (config.astm.port < 1 || config.astm.port > 65535) {
      errors.push(`Invalid ASTM port: ${config.astm.port}`);
    }
    if (config.astm.timeout < 1000) {
      errors.push('ASTM timeout should be at least 1000ms');
    }
  }
  
  // Check for port conflicts
  if (config.hl7.enabled && config.astm.enabled) {
    if (config.hl7.port === config.astm.port) {
      errors.push('HL7 and ASTM servers cannot use the same port');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Print configuration summary
 */
export function printConfigSummary(config: ProtocolConfig): void {
  console.log('=== Protocol Server Configuration ===');
  console.log('');
  
  console.log('HL7 v2 Server:');
  console.log(`  Enabled: ${config.hl7.enabled}`);
  if (config.hl7.enabled) {
    console.log(`  Port: ${config.hl7.port}`);
    console.log(`  Host: ${config.hl7.host}`);
    console.log(`  Supported: ${config.hl7.supportedMessageTypes.join(', ')}`);
  }
  console.log('');
  
  console.log('ASTM E1381 Server:');
  console.log(`  Enabled: ${config.astm.enabled}`);
  if (config.astm.enabled) {
    console.log(`  Port: ${config.astm.port}`);
    console.log(`  Host: ${config.astm.host}`);
    console.log(`  Checksum: ${config.astm.checksumEnabled}`);
  }
  console.log('');
  
  console.log('FHIR R4 API:');
  console.log(`  Enabled: ${config.fhir.enabled}`);
  console.log(`  Base Path: ${config.fhir.basePath}`);
  console.log(`  Version: ${config.fhir.version}`);
  console.log(`  Resources: ${config.fhir.supportedResources.join(', ')}`);
  console.log('');
}

// Export default config
export const defaultConfig = getConfig();
