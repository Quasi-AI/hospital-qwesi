import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const id = request.nextUrl.searchParams.get('id');

    if (id) {
      const doctor = await User.findOne({
        _id: id,
        role: 'doctor',
        approvalStatus: 'approved',
        hasImage: true,
        licenseNumber: { $exists: true, $ne: '' },
        'licenseCertificate.data': { $exists: true, $ne: '' },
      })
        .select('name email image specialization department licenseNumber qualifications yearsOfExperience bio phone address gender')
        .lean();

      if (!doctor) {
        return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
      }

      return NextResponse.json({ doctor });
    }

    const doctors = await User.find({
      role: 'doctor',
      approvalStatus: 'approved',
      hasImage: true,
      licenseNumber: { $exists: true, $ne: '' },
      'licenseCertificate.data': { $exists: true, $ne: '' },
    })
      .select('name email image specialization department licenseNumber qualifications yearsOfExperience bio phone')
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ doctors });
  } catch (error) {
    console.error('Patient doctors error:', error);
    return NextResponse.json({ error: 'Failed to load doctors' }, { status: 500 });
  }
}
