import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import BloodDonor from '@/models/BloodDonor';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const bloodGroup = searchParams.get('bloodGroup');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const eligibleOnly = searchParams.get('eligibleOnly');

    const query: Record<string, unknown> = {};

    if (bloodGroup && bloodGroup !== 'all') {
      query.bloodGroup = bloodGroup;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (eligibleOnly === 'true') {
      query.status = 'active';
      query.$or = [
        { nextEligibleDate: { $lte: new Date() } },
        { nextEligibleDate: { $exists: false } }
      ];
    }

    if (search) {
      const searchQuery = { $regex: search, $options: 'i' };
      query.$or = [
        { firstName: searchQuery },
        { lastName: searchQuery },
        { donorId: searchQuery },
        { phone: searchQuery },
        { email: searchQuery },
      ];
    }

    const donors = await BloodDonor.find(query)
      .sort({ createdAt: -1 })
      .limit(200);

    return NextResponse.json(donors);
  } catch (error: unknown) {
    console.error('Error fetching blood donors:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch blood donors';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();

    if (!body.firstName || !body.lastName || !body.bloodGroup || !body.phone || !body.dateOfBirth) {
      return NextResponse.json(
        { error: 'First name, last name, blood group, phone, and date of birth are required' },
        { status: 400 }
      );
    }

    // Check minimum age (18 years)
    const dob = new Date(body.dateOfBirth);
    const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 18) {
      return NextResponse.json(
        { error: 'Donor must be at least 18 years old' },
        { status: 400 }
      );
    }

    // Check maximum age (65 years for first-time donors)
    if (age > 65) {
      return NextResponse.json(
        { error: 'Donor age exceeds maximum limit' },
        { status: 400 }
      );
    }

    // Check minimum weight (50 kg)
    if (body.weight && body.weight < 50) {
      return NextResponse.json(
        { error: 'Donor must weigh at least 50 kg' },
        { status: 400 }
      );
    }

    // Generate donor ID
    const today = new Date();
    const year = today.getFullYear();
    const count = await BloodDonor.countDocuments({
      createdAt: { $gte: new Date(year, 0, 1) }
    });
    const donorId = `DNR-${year}-${String(count + 1).padStart(5, '0')}`;

    // Check for duplicate phone
    const existingPhone = await BloodDonor.findOne({ phone: body.phone });
    if (existingPhone) {
      return NextResponse.json(
        { error: 'A donor with this phone number already exists' },
        { status: 400 }
      );
    }

    const donor = new BloodDonor({
      ...body,
      donorId,
      totalDonations: 0,
      status: 'active',
      createdBy: session.user?.email || 'Unknown',
    });

    await donor.save();

    return NextResponse.json(donor, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating blood donor:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create blood donor';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
