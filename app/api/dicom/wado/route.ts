import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import fs from 'fs/promises';
import path from 'path';
import connectDB from '../../../../lib/mongodb';
import IncomingImage from '../../../../models/IncomingImage';

// GET - Retrieve DICOM image (WADO-RS endpoint)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Support different query methods
    const imageId = searchParams.get('imageId');
    const sopInstanceUID = searchParams.get('sopInstanceUID');
    const studyUID = searchParams.get('studyUID');
    const seriesUID = searchParams.get('seriesUID');
    const format = searchParams.get('format') || 'dicom'; // 'dicom' or 'rendered'
    
    await connectDB();
    
    let image;
    
    if (imageId) {
      // Lookup by internal ID
      image = await IncomingImage.findById(imageId);
    } else if (sopInstanceUID) {
      // Lookup by SOP Instance UID
      image = await IncomingImage.findOne({ sopInstanceUID });
    } else if (studyUID && seriesUID) {
      // Get first image from series (for series-level retrieval)
      image = await IncomingImage.findOne({
        studyInstanceUID: studyUID,
        seriesInstanceUID: seriesUID,
      }).sort({ instanceNumber: 1 });
    } else {
      return NextResponse.json(
        { error: 'Missing required parameters: imageId, sopInstanceUID, or studyUID+seriesUID' },
        { status: 400 }
      );
    }
    
    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }
    
    // Read the DICOM file
    const filePath = path.join(process.cwd(), image.filePath);
    
    try {
      // Check if file exists first
      try {
        await fs.access(filePath);
      } catch {
        return NextResponse.json(
          { error: 'DICOM file not found on server' },
          { status: 404 }
        );
      }
      
      const fileBuffer = await fs.readFile(filePath);
      
      if (format === 'rendered') {
        // For rendered format, we'd normally convert to JPEG
        // For now, return the DICOM file with appropriate headers
        // A proper implementation would use a library to extract pixel data and convert
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': 'application/dicom',
            'Content-Disposition': `inline; filename="${image.sopInstanceUID}.dcm"`,
            'Content-Length': fileBuffer.length.toString(),
          },
        });
      } else {
        // Return raw DICOM file
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': 'application/dicom',
            'Content-Disposition': `attachment; filename="${image.sopInstanceUID}.dcm"`,
            'Content-Length': fileBuffer.length.toString(),
            'Accept-Ranges': 'bytes',
          },
        });
      }
    } catch (fileError) {
      console.error('Error reading DICOM file:', fileError);
      return NextResponse.json(
        { error: 'Failed to read DICOM file' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in WADO-RS endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve DICOM image' },
      { status: 500 }
    );
  }
}
