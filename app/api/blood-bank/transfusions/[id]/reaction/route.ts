import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import BloodTransfusion from '@/models/BloodTransfusion';

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
    const body = await request.json();

    const transfusion = await BloodTransfusion.findById(id);
    if (!transfusion) {
      return NextResponse.json({ error: 'Transfusion request not found' }, { status: 404 });
    }

    if (!['in-progress', 'completed'].includes(transfusion.status)) {
      return NextResponse.json(
        { error: 'Can only report reactions for in-progress or completed transfusions' },
        { status: 400 }
      );
    }

    if (!body.type || !body.symptoms || !body.actionsTaken) {
      return NextResponse.json(
        { error: 'Reaction type, symptoms, and actions taken are required' },
        { status: 400 }
      );
    }

    const adverseReaction = {
      type: body.type,
      symptoms: Array.isArray(body.symptoms) ? body.symptoms : [body.symptoms],
      onsetTime: body.onsetTime ? new Date(body.onsetTime) : new Date(),
      actionsTaken: body.actionsTaken,
      outcome: body.outcome || 'pending',
      reportedBy: session.user?.name || session.user?.email || 'Unknown',
      reportedAt: new Date()
    };

    const updatedTransfusion = await BloodTransfusion.findByIdAndUpdate(
      id,
      {
        $set: {
          hasAdverseReaction: true,
          adverseReaction
        }
      },
      { new: true }
    );

    return NextResponse.json({
      message: 'Adverse reaction reported successfully',
      transfusion: updatedTransfusion
    });
  } catch (error: unknown) {
    console.error('Error reporting adverse reaction:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to report adverse reaction';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
