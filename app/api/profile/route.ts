import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { verifyProviderLicense } from '@/lib/licenseVerification';
import { getEffectiveProviderApprovalStatus } from '@/lib/providerApproval';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findById(session.user.id).select('-password').lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        ...user,
        approvalStatus: getEffectiveProviderApprovalStatus(user as any),
      },
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      name,
      email,
      image,
      licenseNumber,
      licenseCertificate,
      licenseCertificateFileName,
      licenseCertificateFileType,
    } = await request.json();

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    if (image !== undefined) {
      const imageValue = String(image || '').trim();
      const validDataImage = imageValue === '' || /^data:image\/(png|jpe?g|webp);base64,/i.test(imageValue);
      if (!validDataImage) {
        return NextResponse.json({ error: 'Photo must be a PNG, JPG, or WEBP image' }, { status: 400 });
      }
      if (imageValue.length > 1_600_000) {
        return NextResponse.json({ error: 'Photo is too large. Please upload an image under 1 MB.' }, { status: 400 });
      }
    }

    if (licenseCertificate !== undefined) {
      const certificateValue = String(licenseCertificate || '').trim();
      const validCertificate =
        certificateValue === '' ||
        /^data:(application\/pdf|image\/(png|jpe?g|webp));base64,/i.test(certificateValue);
      if (!validCertificate) {
        return NextResponse.json(
          { error: 'License certificate must be a PDF, PNG, JPG, or WEBP file' },
          { status: 400 }
        );
      }
      if (certificateValue.length > 3_200_000) {
        return NextResponse.json(
          { error: 'License certificate is too large. Please upload a file under 2 MB.' },
          { status: 400 }
        );
      }
    }

    await dbConnect();

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ 
      email: email.toLowerCase(),
      _id: { $ne: session.user.id === 'demo-user' ? null : session.user.id }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email is already taken' }, { status: 400 });
    }

    // For demo user, just return success without updating database
    if (session.user.id === 'demo-user') {
      return NextResponse.json({ 
        message: 'Profile updated successfully',
        user: {
          id: session.user.id,
          name,
          email,
          role: session.user.role
        }
      });
    }

    const existingCurrentUser = await User.findById(session.user.id);
    if (!existingCurrentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isProvider = ['doctor', 'staff'].includes(existingCurrentUser.role);
    const nextImage = image !== undefined ? String(image || '').trim() : existingCurrentUser.image || '';
    const nextLicenseNumber =
      licenseNumber !== undefined ? String(licenseNumber || '').trim() : existingCurrentUser.licenseNumber || '';
    const nextCertificate =
      licenseCertificate !== undefined
        ? String(licenseCertificate || '').trim()
        : existingCurrentUser.licenseCertificate?.data || '';

    const certificateChanged =
      licenseCertificate !== undefined && nextCertificate !== (existingCurrentUser.licenseCertificate?.data || '');
    const licenseNumberChanged =
      licenseNumber !== undefined && nextLicenseNumber !== (existingCurrentUser.licenseNumber || '');

    const updateData: any = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      ...(image !== undefined ? { image: nextImage, hasImage: Boolean(nextImage) } : {}),
      ...(licenseNumber !== undefined ? { licenseNumber: nextLicenseNumber } : {}),
    };

    if (licenseCertificate !== undefined) {
      updateData.licenseCertificate = nextCertificate
        ? {
            fileName: String(licenseCertificateFileName || 'license-certificate').trim(),
            fileType:
              String(licenseCertificateFileType || '').trim() ||
              nextCertificate.match(/^data:([^;]+);base64,/i)?.[1] ||
              'application/octet-stream',
            data: nextCertificate,
            uploadedAt: new Date(),
          }
        : undefined;
    }

    if (isProvider) {
      const hasRequiredProfile = Boolean(nextImage && nextLicenseNumber && nextCertificate);
      if (!hasRequiredProfile) {
        updateData.approvalStatus = 'pending_profile';
        updateData.rejectionReason = undefined;
        updateData.licenseVerification = {
          status: 'not_started',
          method: 'manual',
          checkedAt: new Date(),
          message: 'Profile photo, license number, and license certificate are required.',
        };
      } else if (
        existingCurrentUser.approvalStatus !== 'approved' ||
        certificateChanged ||
        licenseNumberChanged
      ) {
        const verification = await verifyProviderLicense({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          role: existingCurrentUser.role as 'doctor' | 'staff',
          licenseNumber: nextLicenseNumber,
          licenseCertificate: {
            fileName: updateData.licenseCertificate?.fileName || existingCurrentUser.licenseCertificate?.fileName,
            fileType: updateData.licenseCertificate?.fileType || existingCurrentUser.licenseCertificate?.fileType,
            data: nextCertificate,
          },
        });

        updateData.approvalStatus = verification.autoApproved ? 'approved' : 'pending_verification';
        updateData.approvalMethod = verification.autoApproved ? 'official_api' : undefined;
        updateData.approvedBy = verification.autoApproved ? 'official-license-api' : undefined;
        updateData.approvedAt = verification.autoApproved ? new Date() : undefined;
        updateData.rejectionReason = undefined;
        updateData.licenseVerification = {
          status: verification.status,
          method: verification.method || 'manual',
          checkedAt: new Date(),
          message: verification.message,
          reference: verification.reference,
        };
      }
    }

    // Update user in database
    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        image: updatedUser.image || '',
        hasImage: Boolean(updatedUser.image || updatedUser.hasImage),
        hasLicenseCertificate: Boolean(updatedUser.licenseCertificate?.data),
        approvalStatus: getEffectiveProviderApprovalStatus(updatedUser as any),
        licenseNumber: updatedUser.licenseNumber || '',
        licenseCertificate: updatedUser.licenseCertificate || null,
        licenseVerification: updatedUser.licenseVerification || null,
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
