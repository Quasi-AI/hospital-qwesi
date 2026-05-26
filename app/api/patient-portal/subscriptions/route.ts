import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import PatientSubscription from '@/models/PatientSubscription';
import PaystackTransaction from '@/models/PaystackTransaction';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized - Patient access only' }, { status: 401 });
    }

    await dbConnect();
    const [subscriptions, transactions] = await Promise.all([
      PatientSubscription.find({ patientEmail: session.user.email }).sort({ createdAt: -1 }).lean(),
      PaystackTransaction.find({ email: session.user.email }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    return NextResponse.json({ subscriptions, transactions });
  } catch (error: any) {
    console.error('Patient subscriptions fetch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch subscriptions' }, { status: 500 });
  }
}
