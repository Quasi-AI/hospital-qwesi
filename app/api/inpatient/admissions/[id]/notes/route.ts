import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Admission from '@/models/Admission';

// POST - Add nursing note
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const data = await request.json();

    const admission = await Admission.findById(id);
    if (!admission) {
      return NextResponse.json({ error: 'Admission not found' }, { status: 404 });
    }

    if (admission.status === 'discharged') {
      return NextResponse.json(
        { error: 'Cannot add notes to discharged patient' },
        { status: 400 }
      );
    }

    const nursingNote = {
      timestamp: new Date(),
      note: data.note,
      nurseId: session.user?.id,
      nurseName: session.user?.name || 'Unknown',
      category: data.category || 'routine'
    };

    const updatedAdmission = await Admission.findByIdAndUpdate(
      id,
      { $push: { nursingNotes: nursingNote } },
      { new: true }
    );

    return NextResponse.json(updatedAdmission);
  } catch (error: unknown) {
    console.error('Error adding nursing note:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to add nursing note';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
