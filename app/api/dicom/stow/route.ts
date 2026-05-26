import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import connectDB from '../../../../lib/mongodb';
import ImagingDevice from '../../../../models/ImagingDevice';
import IncomingImage from '../../../../models/IncomingImage';
import RadiologyStudy from '../../../../models/RadiologyStudy';

// DICOM tag definitions
const DICOM_TAGS = {
  PatientID: '00100020',
  PatientName: '00100010',
  PatientBirthDate: '00100030',
  PatientSex: '00100040',
  StudyInstanceUID: '0020000D',
  SeriesInstanceUID: '0020000E',
  SOPInstanceUID: '00080018',
  AccessionNumber: '00080050',
  Modality: '00080060',
  StudyDate: '00080020',
  StudyTime: '00080030',
  StudyDescription: '00081030',
  SeriesDescription: '0008103E',
  SeriesNumber: '00200011',
  InstanceNumber: '00200013',
  BodyPartExamined: '00180015',
  Rows: '00280010',
  Columns: '00280011',
  BitsAllocated: '00280100',
  PhotometricInterpretation: '00280004',
  WindowCenter: '00281050',
  WindowWidth: '00281051',
};

// Helper to parse DICOM date (YYYYMMDD) to Date
function parseDicomDate(dateStr: string): Date | undefined {
  if (!dateStr || dateStr.length !== 8) return undefined;
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));
  return new Date(year, month, day);
}

// Helper to extract value from DICOM element
function getElementValue(dataSet: any, tag: string): string | number | undefined {
  try {
    const element = dataSet.elements[`x${tag.toLowerCase()}`];
    if (!element) return undefined;
    
    // Try to get string value
    const stringValue = dataSet.string(`x${tag.toLowerCase()}`);
    if (stringValue !== undefined) return stringValue.trim();
    
    // Try to get numeric values
    const uint16 = dataSet.uint16(`x${tag.toLowerCase()}`);
    if (uint16 !== undefined) return uint16;
    
    const int16 = dataSet.int16(`x${tag.toLowerCase()}`);
    if (int16 !== undefined) return int16;
    
    return undefined;
  } catch {
    return undefined;
  }
}

// Create storage directory structure
async function createStorageDir(studyUID: string, seriesUID: string): Promise<string> {
  const date = new Date();
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  const storagePath = path.join(
    process.cwd(),
    'storage',
    'dicom',
    year,
    month,
    day,
    studyUID.replace(/\./g, '_'),
    seriesUID.replace(/\./g, '_')
  );
  
  await fs.mkdir(storagePath, { recursive: true });
  return storagePath;
}

// Auto-match incoming image to RadiologyStudy
async function autoMatchToStudy(
  patientId: string | undefined,
  accessionNumber: string | undefined,
  studyDate: Date | undefined
): Promise<{ 
  matchedStudyId?: string; 
  matchedStudyNumber?: string;
  matchStatus: 'matched' | 'unmatched' | 'multiple';
  matchConfidence: number;
  possibleMatches: Array<{
    studyId: string;
    studyNumber: string;
    patientName: string;
    studyType: string;
    confidence: number;
  }>;
}> {
  const possibleMatches: Array<{
    studyId: string;
    studyNumber: string;
    patientName: string;
    studyType: string;
    confidence: number;
  }> = [];
  
  // Try exact accession number match first
  if (accessionNumber) {
    const exactMatch = await RadiologyStudy.findOne({ 
      accessionNumber: accessionNumber,
      status: { $in: ['ordered', 'scheduled', 'in-progress'] }
    }).populate('patientId', 'firstName lastName');
    
    if (exactMatch) {
      const patient = exactMatch.patientId as any;
      return {
        matchedStudyId: exactMatch._id.toString(),
        matchedStudyNumber: exactMatch.studyNumber,
        matchStatus: 'matched',
        matchConfidence: 100,
        possibleMatches: [{
          studyId: exactMatch._id.toString(),
          studyNumber: exactMatch.studyNumber,
          patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
          studyType: exactMatch.studyType,
          confidence: 100,
        }],
      };
    }
  }
  
  // Try patient ID + study date match
  if (patientId) {
    const query: any = {
      status: { $in: ['ordered', 'scheduled', 'in-progress'] }
    };
    
    // Search for studies where patient record has matching ID
    const studies = await RadiologyStudy.find(query)
      .populate('patientId', 'firstName lastName patientId')
      .lean();
    
    for (const study of studies) {
      const patient = study.patientId as any;
      if (patient && patient.patientId === patientId) {
        let confidence = 70; // Base confidence for patient ID match
        
        // Increase confidence if study date matches
        if (studyDate && study.scheduledDate) {
          const scheduledDate = new Date(study.scheduledDate);
          const daysDiff = Math.abs(
            (studyDate.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysDiff === 0) confidence = 90;
          else if (daysDiff <= 1) confidence = 85;
          else if (daysDiff <= 7) confidence = 75;
        }
        
        possibleMatches.push({
          studyId: study._id.toString(),
          studyNumber: study.studyNumber,
          patientName: `${patient.firstName} ${patient.lastName}`,
          studyType: study.studyType,
          confidence,
        });
      }
    }
    
    // Sort by confidence
    possibleMatches.sort((a, b) => b.confidence - a.confidence);
    
    if (possibleMatches.length === 1 && possibleMatches[0].confidence >= 80) {
      return {
        matchedStudyId: possibleMatches[0].studyId,
        matchedStudyNumber: possibleMatches[0].studyNumber,
        matchStatus: 'matched',
        matchConfidence: possibleMatches[0].confidence,
        possibleMatches,
      };
    }
    
    if (possibleMatches.length > 1) {
      return {
        matchStatus: 'multiple',
        matchConfidence: 0,
        possibleMatches,
      };
    }
  }
  
  return {
    matchStatus: 'unmatched',
    matchConfidence: 0,
    possibleMatches,
  };
}

// POST - Receive DICOM images (STOW-RS endpoint)
export async function POST(request: NextRequest) {
  try {
    // Authenticate device by API key
    const apiKey = request.headers.get('X-Device-API-Key') || 
                   request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing API key' },
        { status: 401 }
      );
    }
    
    // Hash the provided key and find matching device
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    await connectDB();
    
    const device = await ImagingDevice.findOne({ 
      apiKeyHash,
      isActive: true 
    });
    
    if (!device) {
      return NextResponse.json(
        { error: 'Invalid API key or inactive device' },
        { status: 401 }
      );
    }
    
    // Update device last seen
    device.lastSeenAt = new Date();
    device.connectionStatus = 'online';
    
    // Get the content type
    const contentType = request.headers.get('content-type') || '';
    
    let dicomFiles: { buffer: Buffer; filename: string }[] = [];
    
    // Handle multipart/related (standard STOW-RS) or binary DICOM
    if (contentType.includes('multipart/related')) {
      // Parse multipart request
      const formData = await request.formData();
      const entries = formData.entries();
      
      for (const [, value] of entries) {
        if (value instanceof Blob) {
          const arrayBuffer = await value.arrayBuffer();
          dicomFiles.push({
            buffer: Buffer.from(arrayBuffer),
            filename: (value as any).name || `image_${Date.now()}.dcm`,
          });
        }
      }
    } else if (contentType.includes('application/dicom')) {
      // Single DICOM file
      const arrayBuffer = await request.arrayBuffer();
      dicomFiles.push({
        buffer: Buffer.from(arrayBuffer),
        filename: `image_${Date.now()}.dcm`,
      });
    } else {
      // Try to handle as form data with file upload
      try {
        const formData = await request.formData();
        const files = formData.getAll('files');
        
        for (const file of files) {
          if (file instanceof Blob) {
            const arrayBuffer = await file.arrayBuffer();
            dicomFiles.push({
              buffer: Buffer.from(arrayBuffer),
              filename: (file as any).name || `image_${Date.now()}.dcm`,
            });
          }
        }
      } catch {
        return NextResponse.json(
          { error: 'Unsupported content type' },
          { status: 415 }
        );
      }
    }
    
    if (dicomFiles.length === 0) {
      return NextResponse.json(
        { error: 'No DICOM files received' },
        { status: 400 }
      );
    }
    
    // Import dicom-parser dynamically
    const dicomParser = await import('dicom-parser');
    
    const results: Array<{
      imageNumber: string;
      sopInstanceUID: string;
      matchStatus: string;
      success: boolean;
      error?: string;
    }> = [];
    
    for (const { buffer, filename } of dicomFiles) {
      try {
        // Parse DICOM file
        const byteArray = new Uint8Array(buffer);
        const dataSet = dicomParser.parseDicom(byteArray);
        
        // Extract metadata
        const patientId = getElementValue(dataSet, DICOM_TAGS.PatientID) as string;
        const patientName = getElementValue(dataSet, DICOM_TAGS.PatientName) as string;
        const patientBirthDateStr = getElementValue(dataSet, DICOM_TAGS.PatientBirthDate) as string;
        const patientSex = getElementValue(dataSet, DICOM_TAGS.PatientSex) as string;
        const studyInstanceUID = getElementValue(dataSet, DICOM_TAGS.StudyInstanceUID) as string;
        const seriesInstanceUID = getElementValue(dataSet, DICOM_TAGS.SeriesInstanceUID) as string;
        const sopInstanceUID = getElementValue(dataSet, DICOM_TAGS.SOPInstanceUID) as string;
        const accessionNumber = getElementValue(dataSet, DICOM_TAGS.AccessionNumber) as string;
        const modality = getElementValue(dataSet, DICOM_TAGS.Modality) as string;
        const studyDateStr = getElementValue(dataSet, DICOM_TAGS.StudyDate) as string;
        const studyTime = getElementValue(dataSet, DICOM_TAGS.StudyTime) as string;
        const studyDescription = getElementValue(dataSet, DICOM_TAGS.StudyDescription) as string;
        const seriesDescription = getElementValue(dataSet, DICOM_TAGS.SeriesDescription) as string;
        const seriesNumber = getElementValue(dataSet, DICOM_TAGS.SeriesNumber) as number;
        const instanceNumber = getElementValue(dataSet, DICOM_TAGS.InstanceNumber) as number;
        const bodyPartExamined = getElementValue(dataSet, DICOM_TAGS.BodyPartExamined) as string;
        const rows = getElementValue(dataSet, DICOM_TAGS.Rows) as number;
        const columns = getElementValue(dataSet, DICOM_TAGS.Columns) as number;
        const bitsAllocated = getElementValue(dataSet, DICOM_TAGS.BitsAllocated) as number;
        const photometricInterpretation = getElementValue(dataSet, DICOM_TAGS.PhotometricInterpretation) as string;
        const windowCenter = getElementValue(dataSet, DICOM_TAGS.WindowCenter) as number;
        const windowWidth = getElementValue(dataSet, DICOM_TAGS.WindowWidth) as number;
        
        // Validate required DICOM fields
        if (!studyInstanceUID || !seriesInstanceUID || !sopInstanceUID) {
          results.push({
            imageNumber: '',
            sopInstanceUID: sopInstanceUID || 'unknown',
            matchStatus: 'error',
            success: false,
            error: 'Missing required DICOM UIDs',
          });
          continue;
        }
        
        // Check if image already exists
        const existingImage = await IncomingImage.findOne({ sopInstanceUID });
        if (existingImage) {
          results.push({
            imageNumber: existingImage.imageNumber,
            sopInstanceUID,
            matchStatus: existingImage.matchStatus,
            success: true,
            error: 'Image already exists',
          });
          continue;
        }
        
        // Create storage directory and save file
        const storageDir = await createStorageDir(studyInstanceUID, seriesInstanceUID);
        const filePath = path.join(storageDir, `${sopInstanceUID.replace(/\./g, '_')}.dcm`);
        const relativePath = path.relative(process.cwd(), filePath);
        
        await fs.writeFile(filePath, buffer);
        
        // Parse dates
        const studyDate = parseDicomDate(studyDateStr);
        const patientBirthDate = parseDicomDate(patientBirthDateStr);
        
        // Auto-match to radiology study
        const matchResult = await autoMatchToStudy(
          patientId,
          accessionNumber,
          studyDate
        );
        
        // Create incoming image record
        const incomingImage = new IncomingImage({
          deviceId: device._id,
          deviceCode: device.deviceCode,
          deviceName: device.name,
          receivedAt: new Date(),
          
          // DICOM metadata
          patientId,
          patientName: patientName?.replace(/\^/g, ' ').trim(),
          patientBirthDate,
          patientSex,
          studyInstanceUID,
          seriesInstanceUID,
          sopInstanceUID,
          accessionNumber,
          modality: modality || device.modality,
          studyDate,
          studyTime,
          studyDescription,
          seriesDescription,
          seriesNumber,
          instanceNumber,
          bodyPartExamined,
          
          // Image details
          rows,
          columns,
          bitsAllocated,
          photometricInterpretation,
          windowCenter,
          windowWidth,
          
          // File storage
          filePath: relativePath,
          fileSize: buffer.length,
          
          // Matching
          matchedStudyId: matchResult.matchedStudyId,
          matchedStudyNumber: matchResult.matchedStudyNumber,
          matchStatus: matchResult.matchStatus,
          matchConfidence: matchResult.matchConfidence,
          possibleMatches: matchResult.possibleMatches,
          
          // Workflow
          status: 'pending',
        });
        
        await incomingImage.save();
        
        // Update matched study status to in-progress if matched
        if (matchResult.matchedStudyId) {
          await RadiologyStudy.findByIdAndUpdate(matchResult.matchedStudyId, {
            status: 'in-progress',
            $push: {
              images: {
                filename: filename,
                uploadedAt: new Date(),
                uploadedBy: device.deviceCode,
              }
            }
          });
        }
        
        // Update device stats
        device.totalImagesReceived += 1;
        device.imagesToday += 1;
        device.lastImageAt = new Date();
        
        results.push({
          imageNumber: incomingImage.imageNumber,
          sopInstanceUID,
          matchStatus: matchResult.matchStatus,
          success: true,
        });
        
      } catch (parseError) {
        console.error('Error parsing DICOM file:', parseError);
        results.push({
          imageNumber: '',
          sopInstanceUID: 'unknown',
          matchStatus: 'error',
          success: false,
          error: parseError instanceof Error ? parseError.message : 'Failed to parse DICOM',
        });
      }
    }
    
    // Save device updates
    await device.save();
    
    // Return STOW-RS response
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    return NextResponse.json({
      success: failureCount === 0,
      message: `Received ${successCount} images, ${failureCount} failed`,
      results,
    }, { status: failureCount === 0 ? 200 : 207 });
    
  } catch (error) {
    console.error('Error in STOW-RS endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process DICOM upload' },
      { status: 500 }
    );
  }
}

// Configuration for handling large files
export const config = {
  api: {
    bodyParser: false,
  },
};
