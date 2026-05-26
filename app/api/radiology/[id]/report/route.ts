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

    const data = await request.json();

    const updateData = {
      findings: data.findings,
      impression: data.impression,
      recommendations: data.recommendations,
      isCritical: data.isCritical || false,
      criticalFindings: data.criticalFindings,
      comparisonNotes: data.comparisonNotes,
      reportedBy: session.user?.name || session.user?.email || 'Unknown',
      reportedAt: new Date(),
      status: 'reported',
    };

    const study = await RadiologyStudy.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    if (!study) return NextResponse.json({ error: 'Study not found' }, { status: 404 });

    return NextResponse.json(study);
  } catch (error: unknown) {
    console.error('Error updating radiology report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update report';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
