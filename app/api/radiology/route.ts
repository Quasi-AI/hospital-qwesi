import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import RadiologyStudy from '@/models/RadiologyStudy';

// GET - List all radiology studies
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const studyType = searchParams.get('studyType');
    const patientId = searchParams.get('patientId');
    const priority = searchParams.get('priority');
    const isCritical = searchParams.get('isCritical');

    const query: Record<string, unknown> = {};

    if (status) {
      if (status === 'pending-report') {
        query.status = { $in: ['completed', 'in-progress'] };
      } else {
        query.status = status;
      }
    }

    if (studyType) query.studyType = studyType;
    if (patientId) query.patientId = patientId;
    if (priority) query.priority = priority;
    if (isCritical === 'true') query.isCritical = true;

    const studies = await RadiologyStudy.find(query).sort({ createdAt: -1 });

    return NextResponse.json(studies);
  } catch (error) {
    console.error('Error fetching radiology studies:', error);
    return NextResponse.json({ error: 'Failed to fetch radiology studies' }, { status: 500 });
  }
}

// POST - Create new radiology study
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const data = await request.json();

    // Generate study number
    const count = (await RadiologyStudy.countDocuments()) || 0;
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    const sequence = String(count + 1).padStart(5, '0');
    data.studyNumber = `RAD-${year}${month}${day}-${sequence}`;
    data.createdBy = session.user?.id || 'system';

    const study = new RadiologyStudy(data);
    await study.save();

    return NextResponse.json(study, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating radiology study:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create radiology study';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
