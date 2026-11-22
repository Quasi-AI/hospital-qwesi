import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import AiDoctorSettings from '@/models/AiDoctorSettings';

async function load() {
  await dbConnect();
  return (await AiDoctorSettings.findOne({ key: 'default' }).lean()) || { enabled: false, avatarUrl: '', doctorName: 'Qwesi AI Doctor', cameraEnabled: true };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const s: any = await load();
  return NextResponse.json({
    enabled: Boolean(s.enabled && s.avatarUrl), avatarUrl: s.avatarUrl || '', doctorName: s.doctorName, cameraEnabled: s.cameraEnabled !== false,
    ...(session.user.role === 'admin' ? { rawEnabled: Boolean(s.enabled), backendConfigured: Boolean(process.env.QWESI_BACKEND_URL && process.env.HOSPITAL_DASHBOARD_API_KEY) } : {}),
  });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  const b = await request.json();
  const avatarUrl = String(b.avatarUrl || '').trim();
  if (avatarUrl && !/^(https:\/\/|\/)[^\s]+\.glb(\?[^\s]*)?$/i.test(avatarUrl)) {
    return NextResponse.json({ error: 'Avatar URL must be an https link (or a /path) ending in .glb' }, { status: 400 });
  }
  await dbConnect();
  const doc = await AiDoctorSettings.findOneAndUpdate(
    { key: 'default' },
    { $set: { enabled: Boolean(b.enabled), avatarUrl, doctorName: String(b.doctorName || 'Qwesi AI Doctor').slice(0, 60), cameraEnabled: b.cameraEnabled !== false, updatedBy: session.user.email || '' } },
    { upsert: true, new: true },
  ).lean();
  return NextResponse.json({ success: true, settings: doc });
}
