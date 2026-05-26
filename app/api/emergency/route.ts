import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import EmergencyCase from '@/models/EmergencyCase';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const triageLevel = searchParams.get('triageLevel');
    const search = searchParams.get('search');
    const activeOnly = searchParams.get('activeOnly');

    // Build query
    const query: Record<string, unknown> = {};

    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (triageLevel && triageLevel !== 'all') {
      query.triageLevel = triageLevel;
    }

    // Active cases only (not discharged, transferred, admitted, deceased, or left-ama)
    if (activeOnly === 'true') {
      query.status = { 
        $in: ['waiting', 'in-triage', 'in-treatment', 'under-observation', 'ready-for-discharge'] 
      };
    }

    if (search) {
      query.$or = [
        { caseNumber: { $regex: search, $options: 'i' } },
        { patientName: { $regex: search, $options: 'i' } },
        { chiefComplaint: { $regex: search, $options: 'i' } },
      ];
    }

    const cases = await EmergencyCase.find(query)
      .sort({ 
        // Sort by triage level priority first, then by arrival time
        triageLevel: 1, 
        arrivalTime: 1 
      })
      .limit(200);

    // Custom sort for triage levels
    const triagePriority: Record<string, number> = {
      'critical': 1,
      'urgent': 2,
      'moderate': 3,
      'minor': 4,
      'non-urgent': 5
    };

    const sortedCases = cases.sort((a, b) => {
      const priorityA = triagePriority[a.triageLevel] || 5;
      const priorityB = triagePriority[b.triageLevel] || 5;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime();
    });

    return NextResponse.json(sortedCases);
  } catch (error: unknown) {
    console.error('Error fetching emergency cases:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch emergency cases';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();

    // Validate required fields
    if (!body.patientId || !body.chiefComplaint || !body.triageLevel) {
      return NextResponse.json(
        { error: 'Patient, chief complaint, and triage level are required' },
        { status: 400 }
      );
    }

    // Generate case number
    const count = await EmergencyCase.countDocuments();
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const caseNumber = `ER-${year}${month}${day}-${(count + 1).toString().padStart(4, '0')}`;

    const emergencyCase = new EmergencyCase({
      caseNumber,
      patientId: body.patientId,
      patientName: body.patientName,
      patientAge: body.patientAge,
      patientGender: body.patientGender,
      patientPhone: body.patientPhone,
      triageLevel: body.triageLevel,
      triageNotes: body.triageNotes,
      triagedBy: session.user?.name || session.user?.email,
      triagedAt: new Date(),
      chiefComplaint: body.chiefComplaint,
      arrivalMode: body.arrivalMode || 'walk-in',
      arrivalTime: body.arrivalTime || new Date(),
      injuryType: body.injuryType,
      symptoms: body.symptoms || [],
      allergies: body.allergies || [],
      currentMedications: body.currentMedications || [],
      vitalSigns: body.vitalSigns ? [{
        ...body.vitalSigns,
        recordedAt: new Date(),
        recordedBy: session.user?.name || session.user?.email,
      }] : [],
      attendingDoctorId: body.attendingDoctorId,
      attendingDoctorName: body.attendingDoctorName,
      nurseInCharge: body.nurseInCharge,
      status: 'waiting',
      waitingStartTime: new Date(),
      notes: body.notes,
      createdBy: session.user?.email || 'Unknown',
    });

    await emergencyCase.save();

    return NextResponse.json(emergencyCase, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating emergency case:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create emergency case';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
