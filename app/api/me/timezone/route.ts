import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Patient from '@/models/Patient';
import { isValidTimeZone } from '@/lib/timezone';
import { detectFromRequest } from '@/lib/ipTimeZone';

async function load(email: string) {
  const user: any = await User.findOne({ email }).select('timeZone');
  if (user) return { doc: user };
  const patient: any = await Patient.findOne({ email }).select('timeZone');
  return { doc: patient };
}

/** The signed-in person's own time zone (doctors: also the zone their working hours are written in). */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await dbConnect();
  const { doc } = await load(session.user.email.toLowerCase());
  const detected = detectFromRequest(request.headers);
  return NextResponse.json({ timeZone: doc?.timeZone || null, detected: detected.timeZone, country: detected.country });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { timeZone } = await request.json().catch(() => ({}));
  if (!isValidTimeZone(timeZone)) return NextResponse.json({ error: 'Unknown time zone' }, { status: 400 });
  await dbConnect();
  const { doc } = await load(session.user.email.toLowerCase());
  if (!doc) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  await doc.constructor.updateOne({ _id: doc._id }, { $set: { timeZone } });
  return NextResponse.json({ timeZone });
}
