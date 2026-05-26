// Script to copy real sample DICOM files and link them to existing database entries
// Run with: npx tsx scripts/download-sample-dicom.ts
//
// Prerequisites:
// This script uses DICOM files from pydicom-data repository.
// If the temp_dicom folder doesn't exist, it will provide instructions to download.
//
// The sample files are real medical DICOM images from pydicom test data:
// - CT: liver.dcm, 693_UNCI.dcm (uncompressed CT scans)
// - MR: MR-SIEMENS-DICOM-WithOverlays.dcm, MR2_UNCI.dcm (brain MRI)
// - US: US1_UNCI.dcm, gdcm-US-ALOKA-16.dcm (ultrasound images)
// - DX: RG1_UNCI.dcm (radiograph)
//
// All files use uncompressed transfer syntax (Explicit VR Little Endian)

import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-doc';

// IncomingImage Schema
const incomingImageSchema = new mongoose.Schema({
  imageNumber: String,
  deviceId: mongoose.Schema.Types.ObjectId,
  deviceCode: String,
  deviceName: String,
  receivedAt: Date,
  patientId: String,
  patientName: String,
  patientSex: String,
  studyInstanceUID: String,
  seriesInstanceUID: String,
  sopInstanceUID: String,
  modality: String,
  studyDate: Date,
  studyDescription: String,
  seriesDescription: String,
  seriesNumber: Number,
  instanceNumber: Number,
  bodyPartExamined: String,
  rows: Number,
  columns: Number,
  bitsAllocated: Number,
  filePath: String,
  fileSize: Number,
  matchStatus: String,
  matchConfidence: Number,
  possibleMatches: Array,
  status: String,
  reviewedBy: String,
  reviewedAt: Date,
  appliedAt: Date,
  requiresAttention: Boolean,
  studyGroupId: String,
  seriesGroupId: String,
});

const IncomingImage = mongoose.models.IncomingImage || mongoose.model('IncomingImage', incomingImageSchema);

// Map of modalities to real DICOM files from pydicom-data
const DICOM_SAMPLE_DIR = path.resolve(process.cwd(), 'temp_dicom/pydicom_data/data_store/data');
const RUBO_SAMPLE = path.resolve(process.cwd(), 'temp_dicom/0002.DCM');

// Map modality to appropriate sample files
// ONLY use uncompressed files (Explicit VR Little Endian or Implicit VR)
// Transfer Syntax UIDs: 1.2.840.10008.1.2.1, 1.2.840.10008.1.2
const MODALITY_FILES: Record<string, string[]> = {
  'CT': [
    '693_UNCI.dcm',      // 526KB - Uncompressed
    '693_UNCR.dcm',      // 525KB - Uncompressed
    'liver.dcm',         // 100KB - Uncompressed Liver CT
  ],
  'MR': [
    'MR-SIEMENS-DICOM-WithOverlays.dcm',  // 510KB - Uncompressed MR
    'MR2_UNCI.dcm',                        // Uncompressed MR
  ],
  'US': [
    'US1_UNCI.dcm',      // 901KB - Uncompressed Ultrasound
    'gdcm-US-ALOKA-16.dcm', // Uncompressed Aloka US (Implicit VR)
  ],
  'DX': [
    'RG1_UNCI.dcm',      // 7MB - Uncompressed Radiograph
  ],
  'CR': [
    'RG1_UNCI.dcm',      // Uncompressed Radiograph
  ],
  'MG': [
    '693_UNCI.dcm',      // Use CT as fallback for mammography
    'liver.dcm',
  ],
};

// Fallback to Rubo sample or generic
const FALLBACK_FILE = 'JPEG2000_UNC.dcm';

function getSampleFile(modality: string, index: number): string {
  const files = MODALITY_FILES[modality] || MODALITY_FILES['CT'];
  const fileIdx = index % files.length;
  const samplePath = path.join(DICOM_SAMPLE_DIR, files[fileIdx]);
  
  // Check if file exists
  if (fs.existsSync(samplePath)) {
    return samplePath;
  }
  
  // Try fallback
  const fallbackPath = path.join(DICOM_SAMPLE_DIR, FALLBACK_FILE);
  if (fs.existsSync(fallbackPath)) {
    return fallbackPath;
  }
  
  // Use Rubo sample
  if (fs.existsSync(RUBO_SAMPLE)) {
    return RUBO_SAMPLE;
  }
  
  throw new Error(`No sample DICOM file available for modality ${modality}`);
}

async function main() {
  try {
    // Check if sample DICOM files exist
    if (!fs.existsSync(DICOM_SAMPLE_DIR)) {
      console.error('ERROR: Sample DICOM files not found!');
      console.error('Please run the following commands first:');
      console.error('  cd /Users/rizvimahmudplabon/Desktop/ai-doc');
      console.error('  mkdir -p temp_dicom && cd temp_dicom');
      console.error('  git clone --depth 1 https://github.com/pydicom/pydicom-data.git pydicom_data');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get all incoming images
    const images = await IncomingImage.find({}).lean();
    console.log(`Found ${images.length} incoming images to process`);
    
    // Count by modality
    const modalityCounts: Record<string, number> = {};
    
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const image of images) {
      const filePath = path.resolve(process.cwd(), image.filePath);
      const dirPath = path.dirname(filePath);
      const modality = image.modality || 'CT';
      
      // Track index per modality for variety
      modalityCounts[modality] = (modalityCounts[modality] || 0) + 1;
      const modalityIndex = modalityCounts[modality] - 1;
      
      try {
        // Create directory structure
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        
        // Get appropriate sample file
        const sampleFile = getSampleFile(modality, modalityIndex);
        
        // Check if target already exists and is a real DICOM (not our synthetic one)
        if (fs.existsSync(filePath)) {
          const existingSize = fs.statSync(filePath).size;
          // Our synthetic files were around 8-9KB, real ones are larger
          if (existingSize > 50000) {
            console.log(`  Skipping ${image.imageNumber} - already has real DICOM (${(existingSize / 1024).toFixed(1)}KB)`);
            skipped++;
            continue;
          }
          // Remove synthetic file
          fs.unlinkSync(filePath);
        }
        
        // Copy real DICOM file
        console.log(`  Copying ${path.basename(sampleFile)} -> ${image.imageNumber} (${modality})`);
        fs.copyFileSync(sampleFile, filePath);
        
        // Get actual file size
        const fileSize = fs.statSync(filePath).size;
        
        // Update file size in database
        await IncomingImage.updateOne(
          { _id: image._id },
          { $set: { fileSize: fileSize } }
        );
        
        updated++;
      } catch (err) {
        console.error(`  Error processing ${image.imageNumber}:`, err);
        errors++;
      }
    }
    
    console.log(`\n--- Summary ---`);
    console.log(`Updated: ${updated} images with real DICOM files`);
    console.log(`Skipped: ${skipped} (already have real files)`);
    console.log(`Errors: ${errors}`);
    console.log(`Total: ${images.length} images`);
    
    // Show modality distribution
    console.log('\nModality distribution:');
    for (const [mod, count] of Object.entries(modalityCounts)) {
      console.log(`  ${mod}: ${count} images`);
    }
    
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    console.log('Done! Real DICOM files are now linked to database entries.');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
