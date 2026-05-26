import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import RadiologyStudy from '@/models/RadiologyStudy';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const study = await RadiologyStudy.findById(id);
    if (!study) return NextResponse.json({ error: 'Study not found' }, { status: 404 });

    if (study.status !== 'reported') {
      return NextResponse.json({ error: 'Study must be reported before verification' }, { status: 400 });
    }

    const updatedStudy = await RadiologyStudy.findByIdAndUpdate(id, {
      $set: {
        status: 'verified',
        verifiedBy: session.user?.name || session.user?.email || 'Unknown',
        verifiedAt: new Date(),
      },
    }, { new: true });

    return NextResponse.json(updatedStudy);
  } catch (error: unknown) {
    console.error('Error verifying radiology report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to verify report';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
