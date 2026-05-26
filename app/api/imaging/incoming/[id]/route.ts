import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import fs from 'fs/promises';
import path from 'path';
import connectDB from '../../../../../lib/mongodb';
import IncomingImage from '../../../../../models/IncomingImage';
import RadiologyStudy from '../../../../../models/RadiologyStudy';

// GET - Get single incoming image with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const image = await IncomingImage.findById(id).lean();

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Get matched study details if available
    let matchedStudy = null;
    if (image.matchedStudyId) {
      matchedStudy = await RadiologyStudy.findById(image.matchedStudyId)
        .populate('patientId', 'firstName lastName patientId dateOfBirth gender')
        .populate('referringDoctorId', 'name')
        .lean();
    }

    // Get other images in the same study/series
    const relatedImages = await IncomingImage.find({
      studyInstanceUID: image.studyInstanceUID,
      _id: { $ne: image._id },
    })
      .select('imageNumber seriesInstanceUID instanceNumber modality status')
      .sort({ seriesInstanceUID: 1, instanceNumber: 1 })
      .lean();

    return NextResponse.json({
      image,
      matchedStudy,
      relatedImages,
      seriesCount: new Set(relatedImages.map(i => i.seriesInstanceUID)).size + 1,
      totalImages: relatedImages.length + 1,
    });
  } catch (error) {
    console.error('Error fetching incoming image:', error);
    return NextResponse.json(
      { error: 'Failed to fetch incoming image' },
      { status: 500 }
    );
  }
}

// PUT - Update incoming image (approve, reject, match, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const body = await request.json();
    const { action, studyId, notes, applyToStudy } = body;

    const image = await IncomingImage.findById(id);
    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    switch (action) {
      case 'approve':
        image.status = 'approved';
        image.reviewedBy = session.user?.email || 'system';
        image.reviewedAt = new Date();
        
        // If should apply to matched study
        if (applyToStudy && image.matchedStudyId) {
          const study = await RadiologyStudy.findById(image.matchedStudyId);
          if (study) {
            // Add image reference to study
            if (!study.images) {
              study.images = [];
            }
            study.images.push({
              filename: `${image.imageNumber}.dcm`,
              url: image.filePath,
              uploadedAt: new Date(),
              uploadedBy: session.user?.email || 'system',
            });
            
            // Update study status if not already completed
            if (!['completed', 'reported', 'verified'].includes(study.status)) {
              study.status = 'in-progress';
            }
            
            await study.save();
            image.status = 'applied';
            image.appliedAt = new Date();
          }
        }
        break;

      case 'reject':
        image.status = 'rejected';
        image.reviewedBy = session.user?.email || 'system';
        image.reviewedAt = new Date();
        image.rejectionReason = notes;
        break;

      case 'match':
        if (!studyId) {
          return NextResponse.json(
            { error: 'Study ID required for manual match' },
            { status: 400 }
          );
        }
        
        const study = await RadiologyStudy.findById(studyId)
          .populate('patientId', 'firstName lastName');
        
        if (!study) {
          return NextResponse.json(
            { error: 'Study not found' },
            { status: 404 }
          );
        }
        
        const patient = study.patientId as any;
        image.matchedStudyId = study._id;
        image.matchedStudyNumber = study.studyNumber;
        image.matchStatus = 'manual';
        image.matchConfidence = 100;
        image.possibleMatches = [{
          studyId: study._id.toString(),
          studyNumber: study.studyNumber,
          patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
          studyType: study.studyType,
          confidence: 100,
        }];
        image.requiresAttention = false;
        break;

      case 'approve-all-in-study':
        // Approve all images in the same study
        const result = await IncomingImage.updateMany(
          { 
            studyInstanceUID: image.studyInstanceUID,
            status: 'pending',
          },
          {
            $set: {
              status: 'approved',
              reviewedBy: session.user?.email || 'system',
              reviewedAt: new Date(),
            },
          }
        );
        
        return NextResponse.json({
          message: `Approved ${result.modifiedCount} images in study`,
          modifiedCount: result.modifiedCount,
        });

      default:
        // Regular field update
        if (notes !== undefined) image.notes = notes;
    }

    await image.save();

    return NextResponse.json({
      image,
      message: `Image ${action} successfully`,
    });
  } catch (error: unknown) {
    console.error('Error updating incoming image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update incoming image';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Delete incoming image
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const image = await IncomingImage.findById(id);

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Delete the DICOM file
    try {
      const filePath = path.join(process.cwd(), image.filePath);
      await fs.unlink(filePath);
      
      // Try to delete thumbnail if exists
      if (image.thumbnailPath) {
        const thumbPath = path.join(process.cwd(), image.thumbnailPath);
        await fs.unlink(thumbPath).catch(() => {});
      }
    } catch (fileError) {
      console.warn('Could not delete DICOM file:', fileError);
    }

    // Delete the record
    await IncomingImage.findByIdAndDelete(id);

    return NextResponse.json({
      message: 'Image deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting incoming image:', error);
    return NextResponse.json(
      { error: 'Failed to delete incoming image' },
      { status: 500 }
    );
  }
}
