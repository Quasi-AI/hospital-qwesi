import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Medicine from '@/models/Medicine';
import User from '@/models/User';
import { generateTemporaryPassword } from '@/lib/temporaryPassword';
import { getEffectiveProviderApprovalStatus } from '@/lib/providerApproval';

const DIRECTORY_ROLES = ['admin', 'doctor', 'staff', 'nurse', 'pharmacy'];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!DIRECTORY_ROLES.includes(session.user?.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const pharmacies = await User.find({ role: 'pharmacy' })
      .select('_id name email phone address approvalStatus hasImage licenseNumber licenseCertificate createdAt')
      .sort({ name: 1 })
      .lean();

    const rows = await Promise.all(
      pharmacies.map(async (pharmacy: any) => {
        const medicines = await Medicine.find({
          createdBy: String(pharmacy._id),
          isActive: true,
        })
          .select('_id name genericName strength currentStock unit sellingPrice shelfLocation')
          .sort({ name: 1 })
          .limit(12)
          .lean();

        return {
          ...pharmacy,
          approvalStatus: getEffectiveProviderApprovalStatus(pharmacy as any),
          medicineCount: await Medicine.countDocuments({ createdBy: String(pharmacy._id), isActive: true }),
          medicines,
        };
      })
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching pharmacy providers:', error);
    return NextResponse.json({ error: 'Failed to fetch pharmacies' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can add pharmacies' }, { status: 403 });
    }

    await dbConnect();
    const body = await request.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    if (!name || !email) {
      return NextResponse.json({ error: 'Pharmacy name and email are required' }, { status: 400 });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 400 });
    }

    const password = String(body.password || '').trim() || generateTemporaryPassword();
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    const pharmacy = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 12),
      role: 'pharmacy',
      phone: String(body.phone || '').trim(),
      address: String(body.address || '').trim(),
      licenseNumber: String(body.licenseNumber || '').trim() || undefined,
      approvalStatus: 'pending_profile',
      licenseVerification: {
        status: 'not_started',
        method: 'manual',
        message: 'Waiting for pharmacy profile photo, license number, and license certificate upload.',
      },
    });

    const response = pharmacy.toObject();
    delete response.password;

    return NextResponse.json({ pharmacy: response, temporaryPassword: password }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating pharmacy provider:', error);
    const message = error instanceof Error ? error.message : 'Failed to add pharmacy';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
