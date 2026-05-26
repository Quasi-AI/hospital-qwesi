// Script to seed sample imaging devices and incoming images
// Run with: npx tsx scripts/seed-imaging-devices.ts

import mongoose from 'mongoose';
import crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-doc';

// ImagingDevice Schema (inline to avoid import issues)
const imagingDeviceSchema = new mongoose.Schema({
  deviceCode: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  aeTitle: { type: String, required: true },
  profileId: String,
  profileName: String,
  isCustomProfile: { type: Boolean, default: false },
  manufacturer: { type: String, required: true },
  model: { type: String, required: true },
  serialNumber: String,
  modality: { type: String, required: true },
  supportedModalities: [String],
  location: String,
  apiKeyHash: { type: String, required: true },
  apiKeyPrefix: { type: String, required: true },
  apiKeyGeneratedAt: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  connectionStatus: { type: String, default: 'offline' },
  lastSeenAt: Date,
  lastImageAt: Date,
  totalImagesReceived: { type: Number, default: 0 },
  imagesToday: { type: Number, default: 0 },
  totalStudiesReceived: { type: Number, default: 0 },
  lastResetDate: { type: Date, default: Date.now },
  notes: String,
  createdBy: { type: String, required: true },
}, { timestamps: true });

const ImagingDevice = mongoose.models.ImagingDevice || mongoose.model('ImagingDevice', imagingDeviceSchema);

// IncomingImage Schema
const incomingImageSchema = new mongoose.Schema({
  imageNumber: { type: String, unique: true },
  deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'ImagingDevice', required: true },
  deviceCode: { type: String, required: true },
  deviceName: { type: String, required: true },
  receivedAt: { type: Date, default: Date.now },
  patientId: String,
  patientName: String,
  patientBirthDate: Date,
  patientSex: String,
  studyInstanceUID: { type: String, required: true },
  seriesInstanceUID: { type: String, required: true },
  sopInstanceUID: { type: String, required: true, unique: true },
  accessionNumber: String,
  modality: { type: String, required: true },
  studyDate: Date,
  studyTime: String,
  studyDescription: String,
  seriesDescription: String,
  seriesNumber: Number,
  instanceNumber: Number,
  bodyPartExamined: String,
  rows: Number,
  columns: Number,
  bitsAllocated: Number,
  filePath: { type: String, required: true },
  fileSize: { type: Number, required: true },
  matchedStudyId: { type: mongoose.Schema.Types.ObjectId, ref: 'RadiologyStudy' },
  matchedStudyNumber: String,
  matchStatus: { type: String, default: 'unmatched' },
  matchConfidence: { type: Number, default: 0 },
  possibleMatches: [{ studyId: String, studyNumber: String, patientName: String, studyType: String, confidence: Number }],
  status: { type: String, default: 'pending' },
  reviewedBy: String,
  reviewedAt: Date,
  appliedAt: Date,
  rejectionReason: String,
  notes: String,
  requiresAttention: { type: Boolean, default: false },
  studyGroupId: String,
  seriesGroupId: String,
}, { timestamps: true });

const IncomingImage = mongoose.models.IncomingImage || mongoose.model('IncomingImage', incomingImageSchema);

// Helper function to generate API key
function generateApiKey(): { apiKey: string; apiKeyHash: string; apiKeyPrefix: string } {
  const randomBytes = crypto.randomBytes(32);
  const apiKey = `img_${randomBytes.toString('hex')}`;
  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const apiKeyPrefix = apiKey.substring(0, 12) + '...';
  return { apiKey, apiKeyHash, apiKeyPrefix };
}

// Generate random UID (DICOM style)
function generateUID(): string {
  const prefix = '1.2.840.113619';
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return `${prefix}.${timestamp}.${random}`;
}

async function seedData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await ImagingDevice.deleteMany({});
    await IncomingImage.deleteMany({});
    console.log('Cleared existing imaging data');

    // Create sample devices
    const devices = [
      {
        deviceCode: 'CT-001',
        name: 'CT Scanner Room 1',
        aeTitle: 'CT_SCANNER_1',
        profileId: 'siemens-somatom-force',
        profileName: 'Siemens Healthineers SOMATOM Force',
        manufacturer: 'Siemens Healthineers',
        model: 'SOMATOM Force',
        modality: 'CT',
        supportedModalities: ['CT'],
        location: 'Radiology Wing, Room 101',
        isActive: true,
        connectionStatus: 'online',
        lastSeenAt: new Date(),
        totalImagesReceived: 1250,
        imagesToday: 45,
        totalStudiesReceived: 125,
        createdBy: 'admin@hospital.com',
      },
      {
        deviceCode: 'MR-001',
        name: 'MRI Scanner Room 1',
        aeTitle: 'MRI_SCANNER_1',
        profileId: 'siemens-magnetom-vida',
        profileName: 'Siemens Healthineers MAGNETOM Vida',
        manufacturer: 'Siemens Healthineers',
        model: 'MAGNETOM Vida',
        modality: 'MR',
        supportedModalities: ['MR'],
        location: 'Radiology Wing, Room 105',
        isActive: true,
        connectionStatus: 'online',
        lastSeenAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        totalImagesReceived: 890,
        imagesToday: 32,
        totalStudiesReceived: 89,
        createdBy: 'admin@hospital.com',
      },
      {
        deviceCode: 'US-001',
        name: 'Ultrasound Room 1',
        aeTitle: 'ULTRASOUND_1',
        profileId: 'ge-logiq-e10',
        profileName: 'GE Healthcare LOGIQ E10',
        manufacturer: 'GE Healthcare',
        model: 'LOGIQ E10',
        modality: 'US',
        supportedModalities: ['US'],
        location: 'Radiology Wing, Room 110',
        isActive: true,
        connectionStatus: 'offline',
        lastSeenAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        totalImagesReceived: 450,
        imagesToday: 12,
        totalStudiesReceived: 150,
        createdBy: 'admin@hospital.com',
      },
      {
        deviceCode: 'DX-001',
        name: 'Digital X-Ray Room 1',
        aeTitle: 'XRAY_DIGITAL_1',
        profileId: 'siemens-ysio-max',
        profileName: 'Siemens Healthineers Ysio Max',
        manufacturer: 'Siemens Healthineers',
        model: 'Ysio Max',
        modality: 'DX',
        supportedModalities: ['DX', 'CR'],
        location: 'Radiology Wing, Room 115',
        isActive: true,
        connectionStatus: 'online',
        lastSeenAt: new Date(),
        totalImagesReceived: 2100,
        imagesToday: 78,
        totalStudiesReceived: 420,
        createdBy: 'admin@hospital.com',
      },
      {
        deviceCode: 'MG-001',
        name: 'Mammography Room 1',
        aeTitle: 'MAMMO_1',
        profileId: 'hologic-selenia-dimensions',
        profileName: 'Hologic Selenia Dimensions',
        manufacturer: 'Hologic',
        model: 'Selenia Dimensions',
        modality: 'MG',
        supportedModalities: ['MG'],
        location: 'Womens Health Center, Room 201',
        isActive: true,
        connectionStatus: 'online',
        lastSeenAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        totalImagesReceived: 320,
        imagesToday: 8,
        totalStudiesReceived: 80,
        createdBy: 'admin@hospital.com',
      },
    ];

    const createdDevices: any[] = [];
    const apiKeys: { deviceCode: string; apiKey: string }[] = [];

    for (const deviceData of devices) {
      const { apiKey, apiKeyHash, apiKeyPrefix } = generateApiKey();
      const device = new ImagingDevice({
        ...deviceData,
        apiKeyHash,
        apiKeyPrefix,
        apiKeyGeneratedAt: new Date(),
      });
      await device.save();
      createdDevices.push(device);
      apiKeys.push({ deviceCode: deviceData.deviceCode, apiKey });
    }

    console.log(`Created ${createdDevices.length} imaging devices`);

    // Create sample incoming images
    const incomingImages = [
      // CT Study - matched
      {
        device: createdDevices[0], // CT Scanner
        patientId: 'P-12345',
        patientName: 'John Smith',
        patientSex: 'M',
        studyDescription: 'CT Abdomen with Contrast',
        seriesDescription: 'Axial Series',
        bodyPartExamined: 'ABDOMEN',
        modality: 'CT',
        matchStatus: 'matched',
        matchConfidence: 95,
        status: 'pending',
        imageCount: 3,
      },
      // MRI Study - unmatched
      {
        device: createdDevices[1], // MRI Scanner
        patientId: 'P-67890',
        patientName: 'Jane Doe',
        patientSex: 'F',
        studyDescription: 'MRI Brain without Contrast',
        seriesDescription: 'T1 Weighted',
        bodyPartExamined: 'HEAD',
        modality: 'MR',
        matchStatus: 'unmatched',
        matchConfidence: 0,
        status: 'pending',
        requiresAttention: true,
        imageCount: 5,
      },
      // X-Ray - matched
      {
        device: createdDevices[3], // X-Ray
        patientId: 'P-11111',
        patientName: 'Robert Johnson',
        patientSex: 'M',
        studyDescription: 'Chest X-Ray PA and Lateral',
        seriesDescription: 'PA View',
        bodyPartExamined: 'CHEST',
        modality: 'DX',
        matchStatus: 'matched',
        matchConfidence: 100,
        status: 'pending',
        imageCount: 2,
      },
      // Ultrasound - multiple matches
      {
        device: createdDevices[2], // Ultrasound
        patientId: 'P-22222',
        patientName: 'Mary Williams',
        patientSex: 'F',
        studyDescription: 'Abdominal Ultrasound',
        seriesDescription: 'Complete Study',
        bodyPartExamined: 'ABDOMEN',
        modality: 'US',
        matchStatus: 'multiple',
        matchConfidence: 70,
        status: 'pending',
        requiresAttention: true,
        possibleMatches: [
          { studyId: 'study1', studyNumber: 'RAD-20260216-00001', patientName: 'Mary Williams', studyType: 'Ultrasound', confidence: 85 },
          { studyId: 'study2', studyNumber: 'RAD-20260216-00002', patientName: 'Mary Williams', studyType: 'Ultrasound', confidence: 70 },
        ],
        imageCount: 4,
      },
      // Mammography - approved
      {
        device: createdDevices[4], // Mammography
        patientId: 'P-33333',
        patientName: 'Sarah Brown',
        patientSex: 'F',
        studyDescription: 'Bilateral Screening Mammography',
        seriesDescription: 'MLO View',
        bodyPartExamined: 'BREAST',
        modality: 'MG',
        matchStatus: 'matched',
        matchConfidence: 100,
        status: 'applied',
        reviewedBy: 'admin@hospital.com',
        reviewedAt: new Date(Date.now() - 60 * 60 * 1000),
        appliedAt: new Date(Date.now() - 60 * 60 * 1000),
        imageCount: 4,
      },
    ];

    let totalImages = 0;
    const studyDate = new Date();
    const dateStr = `${studyDate.getFullYear().toString().slice(-2)}${(studyDate.getMonth() + 1).toString().padStart(2, '0')}${studyDate.getDate().toString().padStart(2, '0')}`;

    for (const studyData of incomingImages) {
      const studyUID = generateUID();
      const seriesUID = generateUID();
      
      for (let i = 0; i < studyData.imageCount; i++) {
        totalImages++;
        const sopUID = generateUID();
        
        const image = new IncomingImage({
          imageNumber: `IMG-${dateStr}-${totalImages.toString().padStart(5, '0')}`,
          deviceId: studyData.device._id,
          deviceCode: studyData.device.deviceCode,
          deviceName: studyData.device.name,
          receivedAt: new Date(Date.now() - Math.random() * 3600000), // Within last hour
          patientId: studyData.patientId,
          patientName: studyData.patientName,
          patientSex: studyData.patientSex,
          studyInstanceUID: studyUID,
          seriesInstanceUID: seriesUID,
          sopInstanceUID: sopUID,
          modality: studyData.modality,
          studyDate: studyDate,
          studyDescription: studyData.studyDescription,
          seriesDescription: studyData.seriesDescription,
          seriesNumber: 1,
          instanceNumber: i + 1,
          bodyPartExamined: studyData.bodyPartExamined,
          rows: 512,
          columns: 512,
          bitsAllocated: 16,
          filePath: `storage/dicom/${studyDate.getFullYear()}/${(studyDate.getMonth() + 1).toString().padStart(2, '0')}/${studyDate.getDate().toString().padStart(2, '0')}/${studyUID.replace(/\./g, '_')}/${seriesUID.replace(/\./g, '_')}/${sopUID.replace(/\./g, '_')}.dcm`,
          fileSize: Math.floor(500000 + Math.random() * 2000000), // 500KB - 2.5MB
          matchStatus: studyData.matchStatus,
          matchConfidence: studyData.matchConfidence,
          possibleMatches: studyData.possibleMatches || [],
          status: studyData.status,
          reviewedBy: studyData.reviewedBy,
          reviewedAt: studyData.reviewedAt,
          appliedAt: studyData.appliedAt,
          requiresAttention: studyData.requiresAttention || false,
          studyGroupId: studyUID,
          seriesGroupId: `${studyUID}-${seriesUID}`,
        });
        
        await image.save();
      }
    }

    console.log(`Created ${totalImages} incoming images`);

    // Print API keys for testing
    console.log('\n--- API Keys for Testing ---');
    for (const { deviceCode, apiKey } of apiKeys) {
      console.log(`${deviceCode}: ${apiKey}`);
    }

    console.log('\n--- Seed Summary ---');
    console.log(`- ${createdDevices.length} imaging devices`);
    console.log(`- ${totalImages} incoming images`);
    console.log('  - CT: 3 images (matched)');
    console.log('  - MRI: 5 images (unmatched)');
    console.log('  - X-Ray: 2 images (matched)');
    console.log('  - Ultrasound: 4 images (multiple matches)');
    console.log('  - Mammography: 4 images (applied)');

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');

  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
