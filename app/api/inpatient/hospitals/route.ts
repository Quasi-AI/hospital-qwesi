import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Hospital from '@/models/Hospital';

const DEFAULT_HOSPITAL = {
  name: 'Qwesi AI Virtual Hospital',
  code: 'QWESI-VIRTUAL',
  type: 'virtual' as const,
  notes: 'Default connected virtual hospital workspace',
  isActive: true,
};

function makeHospitalCode(name: string) {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 18) || 'HOSPITAL';
  return `${base}-${Date.now().toString(36).toUpperCase()}`;
}

async function ensureDefaultHospital(createdBy?: string) {
  return Hospital.findOneAndUpdate(
    { name: DEFAULT_HOSPITAL.name },
    { $setOnInsert: { ...DEFAULT_HOSPITAL, createdBy } },
    { upsert: true, new: true }
  );
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    await ensureDefaultHospital(session.user?.id);

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');

    const query: Record<string, unknown> = {};
    if (isActive !== null && isActive !== '') query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { region: { $regex: search, $options: 'i' } },
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

    await dbConnect();
    const data = await request.json();
    const name = String(data.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Hospital name is required' }, { status: 400 });
    }

    const hospital = await Hospital.findOneAndUpdate(
      { name },
      {
        $setOnInsert: {
          name,
          code: data.code || makeHospitalCode(name),
          type: data.type || 'local',
          region: data.region || '',
          city: data.city || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          notes: data.notes || '',
          isActive: data.isActive !== undefined ? data.isActive : true,
          createdBy: session.user?.id,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    return NextResponse.json(hospital, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating hospital:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create hospital';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
