import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { generateTemporaryPassword } from '@/lib/temporaryPassword';
import { sendCredentialEmail } from '@/lib/notifications/credential-email';
import { getEffectiveProviderApprovalStatus } from '@/lib/providerApproval';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only admin can access staff list
    if (!session?.user?.email || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('id');

    // If ID is provided, return single staff member
    if (staffId) {
      const staffMember = await User.findById(staffId).select('-password');
      if (!staffMember) {
        return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
      }
      const staffResponse = staffMember.toObject();
      staffResponse.approvalStatus = getEffectiveProviderApprovalStatus(staffResponse);
      return NextResponse.json(staffResponse);
    }

    // Otherwise return all staff members
    const staff = await User.find({ role: { $in: ['staff', 'nurse'] } })
      .select('-password -image -licenseCertificate.data')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      staff.map((staffMember) => ({
        ...staffMember,
        approvalStatus: getEffectiveProviderApprovalStatus(staffMember as any),
      }))
    );

  } catch (error) {
    console.error('Staff fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only admin can create staff
    if (!session?.user?.email || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { name, email, password, role } = await request.json();

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const temporaryPassword = password?.trim() || generateTemporaryPassword();

    if (temporaryPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    await dbConnect();

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    // Create new user with staff role
    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'staff',
      approvalStatus: ['staff', 'nurse'].includes(role || 'staff') ? 'pending_profile' : 'approved',
      licenseVerification: {
        status: 'not_started',
        method: 'manual',
        message: 'Waiting for profile photo and license certificate upload.',
      },
    });

    await newUser.save();

    const credentialEmail = await sendCredentialEmail({
      to: newUser.email,
      name: newUser.name,
      role: newUser.role,
      password: temporaryPassword,
    });

    // Return user without password
    const userResponse = newUser.toObject();
    delete userResponse.password;

    return NextResponse.json({ 
      message: 'Staff member created successfully',
      user: userResponse,
      credentialEmail,
    });

  } catch (error) {
    console.error('Staff creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only admin can update staff
    if (!session?.user?.email || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('id');

    if (!staffId) {
      return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { 
      name, 
      email, 
      password, 
      role,
      phone,
      specialization,
      department,
      licenseNumber,
      qualifications,
      yearsOfExperience,
      bio,
      address,
      dateOfBirth,
      gender
    } = body;

    await dbConnect();

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (role) updateData.role = role;
    if (password && password.length >= 6) {
      updateData.password = await bcrypt.hash(password, 12);
    }
    
    // Additional fields
    if (phone !== undefined) updateData.phone = phone;
    if (specialization !== undefined) updateData.specialization = specialization;
    if (department !== undefined) updateData.department = department;
    if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber;
    if (qualifications !== undefined) updateData.qualifications = qualifications;
    if (yearsOfExperience !== undefined) updateData.yearsOfExperience = yearsOfExperience ? parseInt(yearsOfExperience) : null;
    if (bio !== undefined) updateData.bio = bio;
    if (address !== undefined) updateData.address = address;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    if (gender !== undefined) updateData.gender = gender;

    const updatedUser = await User.findByIdAndUpdate(
      staffId,
      { $set: updateData },
      { returnDocument: 'after' }
    ).select('-password');

    if (!updatedUser) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Staff member updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Staff update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only admin can delete staff
    if (!session?.user?.email || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('id');

    if (!staffId) {
      return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 });
    }

    // Prevent deleting own account
    if (staffId === session.user.id || staffId === 'demo-user' || staffId === 'admin-user') {
      return NextResponse.json({ error: 'Cannot delete your own account or demo accounts' }, { status: 400 });
    }

    await dbConnect();

    const deletedUser = await User.findByIdAndDelete(staffId);

    if (!deletedUser) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Staff member deleted successfully'
    });

  } catch (error) {
    console.error('Staff deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
