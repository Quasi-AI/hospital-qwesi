import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Hospital from '@/models/Hospital';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { generateTemporaryPassword } from '@/lib/temporaryPassword';

function makeHospitalCode(name: string) {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 18) || 'HOSPITAL';
  return `${base}-${Date.now().toString(36).toUpperCase()}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');
    const region = searchParams.get('region');
    const city = searchParams.get('city');
    const type = searchParams.get('type');

    const query: Record<string, unknown> = {};
    if (isActive !== null && isActive !== '') query.isActive = isActive === 'true';
    if (region) query.region = { $regex: region, $options: 'i' };
    if (city) query.city = { $regex: city, $options: 'i' };
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { region: { $regex: search, $options: 'i' } },
        { district: { $regex: search, $options: 'i' } },
      ];
    }

    const hospitals = await Hospital.find(query).sort({ type: -1, name: 1 });
    return NextResponse.json(hospitals);
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    return NextResponse.json({ error: 'Failed to fetch hospitals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can connect hospitals' }, { status: 403 });
    }

    await dbConnect();
    const data = await request.json();
    const name = String(data.name || '').trim();
    const loginEmail = String(data.loginEmail || data.email || '').trim().toLowerCase();
    if (!name) {
      return NextResponse.json({ error: 'Hospital name is required' }, { status: 400 });
    }

    let hospitalUser: any = null;
    let temporaryPassword = '';
    if (loginEmail) {
      const password = String(data.password || '').trim() || generateTemporaryPassword();
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
      }
      temporaryPassword = password;
      hospitalUser = await User.findOneAndUpdate(
        { email: loginEmail },
        {
          $set: {
            email: loginEmail,
            name,
            role: 'hospital',
            password: await bcrypt.hash(password, 12),
            phone: String(data.phone || '').trim(),
            address: String(data.address || [data.city, data.region].filter(Boolean).join(', ')).trim(),
            approvalStatus: 'approved',
            approvalMethod: 'manual',
            approvedBy: session.user?.email,
            approvedAt: new Date(),
          },
        },
        { upsert: true, new: true, runValidators: true }
      );
    }

    const hospital = await Hospital.findOneAndUpdate(
      { name },
      {
        $set: {
          name,
          type: data.type || 'local',
          region: data.region || '',
          city: data.city || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          notes: data.notes || '',
          ownership: data.ownership || '',
          district: data.district || '',
          latitude: data.latitude === undefined || data.latitude === '' ? undefined : Number(data.latitude),
          longitude: data.longitude === undefined || data.longitude === '' ? undefined : Number(data.longitude),
          isActive: data.isActive !== undefined ? data.isActive : true,
          createdBy: session.user?.id,
          ...(hospitalUser ? { userId: hospitalUser._id, loginEmail } : {}),
        },
        $setOnInsert: {
          code: data.code || makeHospitalCode(name),
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    return NextResponse.json({ hospital, temporaryPassword: hospitalUser ? temporaryPassword : undefined }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating hospital:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create hospital';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
