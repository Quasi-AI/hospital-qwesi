// Script to seed sample device results data
// Run with: npx tsx scripts/seed-device-results.ts

import mongoose from 'mongoose';
import crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-doc';

// Define schemas inline to avoid import issues
const parameterMappingSchema = new mongoose.Schema({
  deviceCode: String,
  testName: String,
  unit: String,
  normalRange: String,
  criticalLow: String,
  criticalHigh: String,
});

const labDeviceSchema = new mongoose.Schema({
  deviceCode: { type: String, required: true, unique: true },
  name: String,
  profileId: String,
  profileName: String,
  isCustomProfile: { type: Boolean, default: false },
  manufacturer: String,
  model: String,
  serialNumber: String,
  category: String,
  location: String,
  apiKey: String,
  apiKeyHash: String,
  apiKeyPrefix: String,
  apiKeyGeneratedAt: Date,
  isActive: { type: Boolean, default: true },
  connectionStatus: { type: String, default: 'offline' },
  lastSeenAt: Date,
  lastResultAt: Date,
  lastError: String,
  parameterMappings: [parameterMappingSchema],
  totalResultsReceived: { type: Number, default: 0 },
  resultsToday: { type: Number, default: 0 },
  lastResetDate: Date,
  notes: String,
  createdBy: String,
}, { timestamps: true });

const deviceResultParameterSchema = new mongoose.Schema({
  parameterCode: String,
  parameterName: String,
  value: String,
  unit: String,
  normalRange: String,
  flag: String,
  rawValue: String,
});

const possibleMatchSchema = new mongoose.Schema({
  labTestId: String,
  testNumber: String,
  patientName: String,
  testType: String,
  confidence: Number,
});

const deviceResultSchema = new mongoose.Schema({
  resultNumber: { type: String, unique: true },
  deviceId: String,
  deviceCode: String,
  deviceName: String,
  receivedAt: { type: Date, default: Date.now },
  analyzedAt: Date,
  sampleId: String,
  patientId: String,
  patientName: String,
  matchedLabTestId: String,
  matchedTestNumber: String,
  matchStatus: { type: String, default: 'unmatched' },
  matchConfidence: { type: Number, default: 0 },
  possibleMatches: [possibleMatchSchema],
  results: [deviceResultParameterSchema],
  status: { type: String, default: 'pending' },
  reviewedBy: String,
  reviewerName: String,
  reviewedAt: Date,
  appliedAt: Date,
  rejectionReason: String,
  notes: String,
  hasCriticalValues: { type: Boolean, default: false },
  requiresAttention: { type: Boolean, default: false },
  rawPayload: String,
}, { timestamps: true });

const LabDevice = mongoose.models.LabDevice || mongoose.model('LabDevice', labDeviceSchema);
const DeviceResult = mongoose.models.DeviceResult || mongoose.model('DeviceResult', deviceResultSchema);

async function seedData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create sample devices
    const devices = [
      {
        deviceCode: 'HEM-001',
        name: 'Hematology Lab 1',
        profileId: 'sysmex-xp-100',
        profileName: 'Sysmex XP-100',
        manufacturer: 'Sysmex',
        model: 'XP-100',
        category: 'hematology',
        location: 'Lab Room A',
        isActive: true,
        connectionStatus: 'online',
        lastSeenAt: new Date(),
        totalResultsReceived: 156,
        resultsToday: 12,
        createdBy: 'admin@hospital.com',
      },
      {
        deviceCode: 'CHEM-001',
        name: 'Chemistry Analyzer 1',
        profileId: 'siemens-dimension-exl-200',
        profileName: 'Siemens Dimension EXL 200',
        manufacturer: 'Siemens',
        model: 'Dimension EXL 200',
        category: 'biochemistry',
        location: 'Lab Room B',
        isActive: true,
        connectionStatus: 'online',
        lastSeenAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        totalResultsReceived: 89,
        resultsToday: 8,
        createdBy: 'admin@hospital.com',
      },
      {
        deviceCode: 'HEM-002',
        name: 'Hematology Lab 2',
        profileId: 'mythic-22-al',
        profileName: 'Orphée / C2 Diagnostics Mythic 22 AL',
        manufacturer: 'Orphée / C2 Diagnostics',
        model: 'Mythic 22 AL',
        category: 'hematology',
        location: 'Lab Room A',
        isActive: true,
        connectionStatus: 'offline',
        lastSeenAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        totalResultsReceived: 45,
        resultsToday: 3,
        createdBy: 'admin@hospital.com',
      },
    ];

    // Generate API keys for devices
    for (const device of devices) {
      const randomBytes = crypto.randomBytes(32);
      const apiKey = `dk_${randomBytes.toString('hex')}`;
      const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
      const apiKeyPrefix = apiKey.substring(0, 11) + '...';
      
      (device as any).apiKeyHash = apiKeyHash;
      (device as any).apiKeyPrefix = apiKeyPrefix;
      (device as any).apiKeyGeneratedAt = new Date();
      (device as any).lastResetDate = new Date();
    }

    // Upsert devices
    for (const device of devices) {
      await LabDevice.findOneAndUpdate(
        { deviceCode: device.deviceCode },
        device,
        { upsert: true, new: true }
      );
    }
    console.log('Created/updated devices');

    // Get device IDs
    const hemDevice = await LabDevice.findOne({ deviceCode: 'HEM-001' });
    const chemDevice = await LabDevice.findOne({ deviceCode: 'CHEM-001' });
    const hem2Device = await LabDevice.findOne({ deviceCode: 'HEM-002' });

    // Create sample device results
    const now = new Date();
    const deviceResults = [
      // Matched result - normal CBC
      {
        resultNumber: `DR-${now.getFullYear().toString().slice(-2)}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}-00001`,
        deviceId: hemDevice?._id?.toString(),
        deviceCode: 'HEM-001',
        deviceName: 'Hematology Lab 1',
        receivedAt: new Date(Date.now() - 5 * 60 * 1000),
        analyzedAt: new Date(Date.now() - 6 * 60 * 1000),
        sampleId: 'LAB-20260216-00042',
        matchedTestNumber: 'LAB-20260216-00042',
        matchStatus: 'matched',
        matchConfidence: 100,
        status: 'pending',
        hasCriticalValues: false,
        requiresAttention: false,
        results: [
          { parameterCode: 'WBC', parameterName: 'White Blood Cells', value: '7.2', unit: '10³/µL', normalRange: '4.5-11.0', flag: 'normal' },
          { parameterCode: 'RBC', parameterName: 'Red Blood Cells', value: '4.8', unit: '10⁶/µL', normalRange: '4.5-5.5', flag: 'normal' },
          { parameterCode: 'HGB', parameterName: 'Hemoglobin', value: '14.5', unit: 'g/dL', normalRange: '12.0-17.5', flag: 'normal' },
          { parameterCode: 'HCT', parameterName: 'Hematocrit', value: '43', unit: '%', normalRange: '36-50', flag: 'normal' },
          { parameterCode: 'PLT', parameterName: 'Platelet Count', value: '245', unit: '10³/µL', normalRange: '150-400', flag: 'normal' },
          { parameterCode: 'MCV', parameterName: 'Mean Corpuscular Volume', value: '89', unit: 'fL', normalRange: '80-100', flag: 'normal' },
          { parameterCode: 'MCH', parameterName: 'Mean Corpuscular Hemoglobin', value: '30', unit: 'pg', normalRange: '27-33', flag: 'normal' },
        ],
      },
      // Matched result with abnormal values
      {
        resultNumber: `DR-${now.getFullYear().toString().slice(-2)}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}-00002`,
        deviceId: hemDevice?._id?.toString(),
        deviceCode: 'HEM-001',
        deviceName: 'Hematology Lab 1',
        receivedAt: new Date(Date.now() - 15 * 60 * 1000),
        analyzedAt: new Date(Date.now() - 16 * 60 * 1000),
        sampleId: 'LAB-20260216-00038',
        matchedTestNumber: 'LAB-20260216-00038',
        matchStatus: 'matched',
        matchConfidence: 100,
        status: 'pending',
        hasCriticalValues: false,
        requiresAttention: false,
        results: [
          { parameterCode: 'WBC', parameterName: 'White Blood Cells', value: '12.5', unit: '10³/µL', normalRange: '4.5-11.0', flag: 'high' },
          { parameterCode: 'RBC', parameterName: 'Red Blood Cells', value: '4.2', unit: '10⁶/µL', normalRange: '4.5-5.5', flag: 'low' },
          { parameterCode: 'HGB', parameterName: 'Hemoglobin', value: '11.8', unit: 'g/dL', normalRange: '12.0-17.5', flag: 'low' },
          { parameterCode: 'HCT', parameterName: 'Hematocrit', value: '35', unit: '%', normalRange: '36-50', flag: 'low' },
          { parameterCode: 'PLT', parameterName: 'Platelet Count', value: '320', unit: '10³/µL', normalRange: '150-400', flag: 'normal' },
        ],
      },
      // Critical values result
      {
        resultNumber: `DR-${now.getFullYear().toString().slice(-2)}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}-00003`,
        deviceId: hemDevice?._id?.toString(),
        deviceCode: 'HEM-001',
        deviceName: 'Hematology Lab 1',
        receivedAt: new Date(Date.now() - 3 * 60 * 1000),
        analyzedAt: new Date(Date.now() - 4 * 60 * 1000),
        sampleId: 'LAB-20260216-00045',
        matchedTestNumber: 'LAB-20260216-00045',
        matchStatus: 'matched',
        matchConfidence: 100,
        status: 'pending',
        hasCriticalValues: true,
        requiresAttention: true,
        results: [
          { parameterCode: 'WBC', parameterName: 'White Blood Cells', value: '1.8', unit: '10³/µL', normalRange: '4.5-11.0', flag: 'critical-low' },
          { parameterCode: 'RBC', parameterName: 'Red Blood Cells', value: '2.1', unit: '10⁶/µL', normalRange: '4.5-5.5', flag: 'critical-low' },
          { parameterCode: 'HGB', parameterName: 'Hemoglobin', value: '6.5', unit: 'g/dL', normalRange: '12.0-17.5', flag: 'critical-low' },
          { parameterCode: 'HCT', parameterName: 'Hematocrit', value: '19', unit: '%', normalRange: '36-50', flag: 'critical-low' },
          { parameterCode: 'PLT', parameterName: 'Platelet Count', value: '42', unit: '10³/µL', normalRange: '150-400', flag: 'critical-low' },
        ],
      },
      // Unmatched result
      {
        resultNumber: `DR-${now.getFullYear().toString().slice(-2)}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}-00004`,
        deviceId: chemDevice?._id?.toString(),
        deviceCode: 'CHEM-001',
        deviceName: 'Chemistry Analyzer 1',
        receivedAt: new Date(Date.now() - 10 * 60 * 1000),
        analyzedAt: new Date(Date.now() - 11 * 60 * 1000),
        sampleId: 'SAMPLE-12345',
        matchStatus: 'unmatched',
        matchConfidence: 0,
        status: 'pending',
        hasCriticalValues: false,
        requiresAttention: true,
        results: [
          { parameterCode: 'GLU', parameterName: 'Glucose', value: '95', unit: 'mg/dL', normalRange: '70-100', flag: 'normal' },
          { parameterCode: 'BUN', parameterName: 'Blood Urea Nitrogen', value: '15', unit: 'mg/dL', normalRange: '7-20', flag: 'normal' },
          { parameterCode: 'CREA', parameterName: 'Creatinine', value: '1.0', unit: 'mg/dL', normalRange: '0.6-1.2', flag: 'normal' },
          { parameterCode: 'NA', parameterName: 'Sodium', value: '140', unit: 'mEq/L', normalRange: '136-145', flag: 'normal' },
          { parameterCode: 'K', parameterName: 'Potassium', value: '4.2', unit: 'mEq/L', normalRange: '3.5-5.0', flag: 'normal' },
        ],
      },
      // Chemistry result with high glucose
      {
        resultNumber: `DR-${now.getFullYear().toString().slice(-2)}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}-00005`,
        deviceId: chemDevice?._id?.toString(),
        deviceCode: 'CHEM-001',
        deviceName: 'Chemistry Analyzer 1',
        receivedAt: new Date(Date.now() - 8 * 60 * 1000),
        analyzedAt: new Date(Date.now() - 9 * 60 * 1000),
        sampleId: 'LAB-20260216-00040',
        matchedTestNumber: 'LAB-20260216-00040',
        matchStatus: 'matched',
        matchConfidence: 100,
        status: 'pending',
        hasCriticalValues: false,
        requiresAttention: false,
        results: [
          { parameterCode: 'GLU', parameterName: 'Glucose', value: '185', unit: 'mg/dL', normalRange: '70-100', flag: 'high' },
          { parameterCode: 'BUN', parameterName: 'Blood Urea Nitrogen', value: '18', unit: 'mg/dL', normalRange: '7-20', flag: 'normal' },
          { parameterCode: 'CREA', parameterName: 'Creatinine', value: '1.1', unit: 'mg/dL', normalRange: '0.6-1.2', flag: 'normal' },
          { parameterCode: 'CHOL', parameterName: 'Total Cholesterol', value: '220', unit: 'mg/dL', normalRange: '<200', flag: 'high' },
          { parameterCode: 'TG', parameterName: 'Triglycerides', value: '180', unit: 'mg/dL', normalRange: '<150', flag: 'high' },
          { parameterCode: 'HDL', parameterName: 'HDL Cholesterol', value: '38', unit: 'mg/dL', normalRange: '>40', flag: 'low' },
        ],
      },
      // Result from second hematology device
      {
        resultNumber: `DR-${now.getFullYear().toString().slice(-2)}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}-00006`,
        deviceId: hem2Device?._id?.toString(),
        deviceCode: 'HEM-002',
        deviceName: 'Hematology Lab 2',
        receivedAt: new Date(Date.now() - 25 * 60 * 1000),
        analyzedAt: new Date(Date.now() - 26 * 60 * 1000),
        sampleId: 'LAB-20260216-00035',
        matchedTestNumber: 'LAB-20260216-00035',
        matchStatus: 'matched',
        matchConfidence: 100,
        status: 'pending',
        hasCriticalValues: false,
        requiresAttention: false,
        results: [
          { parameterCode: 'WBC', parameterName: 'White Blood Cells', value: '6.8', unit: '10³/µL', normalRange: '4.5-11.0', flag: 'normal' },
          { parameterCode: 'RBC', parameterName: 'Red Blood Cells', value: '5.0', unit: '10⁶/µL', normalRange: '4.5-5.5', flag: 'normal' },
          { parameterCode: 'HGB', parameterName: 'Hemoglobin', value: '15.2', unit: 'g/dL', normalRange: '12.0-17.5', flag: 'normal' },
          { parameterCode: 'PLT', parameterName: 'Platelet Count', value: '198', unit: '10³/µL', normalRange: '150-400', flag: 'normal' },
        ],
      },
      // Already approved result
      {
        resultNumber: `DR-${now.getFullYear().toString().slice(-2)}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}-00007`,
        deviceId: hemDevice?._id?.toString(),
        deviceCode: 'HEM-001',
        deviceName: 'Hematology Lab 1',
        receivedAt: new Date(Date.now() - 60 * 60 * 1000),
        analyzedAt: new Date(Date.now() - 61 * 60 * 1000),
        sampleId: 'LAB-20260216-00030',
        matchedTestNumber: 'LAB-20260216-00030',
        matchStatus: 'matched',
        matchConfidence: 100,
        status: 'applied',
        reviewedBy: 'tech@hospital.com',
        reviewerName: 'Lab Technician',
        reviewedAt: new Date(Date.now() - 55 * 60 * 1000),
        appliedAt: new Date(Date.now() - 55 * 60 * 1000),
        hasCriticalValues: false,
        requiresAttention: false,
        results: [
          { parameterCode: 'WBC', parameterName: 'White Blood Cells', value: '8.5', unit: '10³/µL', normalRange: '4.5-11.0', flag: 'normal' },
          { parameterCode: 'RBC', parameterName: 'Red Blood Cells', value: '4.6', unit: '10⁶/µL', normalRange: '4.5-5.5', flag: 'normal' },
          { parameterCode: 'HGB', parameterName: 'Hemoglobin', value: '13.8', unit: 'g/dL', normalRange: '12.0-17.5', flag: 'normal' },
          { parameterCode: 'PLT', parameterName: 'Platelet Count', value: '275', unit: '10³/µL', normalRange: '150-400', flag: 'normal' },
        ],
      },
    ];

    // Delete existing device results and insert new ones
    await DeviceResult.deleteMany({});
    await DeviceResult.insertMany(deviceResults);
    console.log(`Created ${deviceResults.length} device results`);

    console.log('\nSeed data created successfully!');
    console.log('\nSummary:');
    console.log(`- ${devices.length} devices`);
    console.log(`- ${deviceResults.length} device results`);
    console.log('  - 5 pending results');
    console.log('  - 1 critical value result');
    console.log('  - 1 unmatched result');
    console.log('  - 1 applied result');

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
