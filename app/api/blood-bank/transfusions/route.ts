import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import BloodTransfusion from '@/models/BloodTransfusion';
import Patient from '@/models/Patient';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const urgency = searchParams.get('urgency');
    const bloodGroup = searchParams.get('bloodGroup');
    const patientId = searchParams.get('patientId');
    const search = searchParams.get('search');
    const activeOnly = searchParams.get('activeOnly');

    const query: Record<string, unknown> = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (urgency && urgency !== 'all') {
      query.urgency = urgency;
    }

    if (bloodGroup && bloodGroup !== 'all') {
      query.requestedBloodGroup = bloodGroup;
    }

    if (patientId) {
      query.patientId = patientId;
    }

    if (activeOnly === 'true') {
      query.status = { $nin: ['completed', 'cancelled', 'rejected'] };
    }

    if (search) {
      query.$or = [
        { requestNumber: { $regex: search, $options: 'i' } },
        { patientName: { $regex: search, $options: 'i' } },
        { requestedBy: { $regex: search, $options: 'i' } },
      ];
    }

    const transfusions = await BloodTransfusion.find(query)
      .sort({ requestedAt: -1 })
      .limit(200);

    return NextResponse.json(transfusions);
  } catch (error: unknown) {
    console.error('Error fetching transfusions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch transfusions';
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

    if (!body.patientId || !body.requestedBloodGroup || !body.requestedComponent || !body.unitsRequested || !body.reason) {
      return NextResponse.json(
        { error: 'Patient, blood group, component, units requested, and reason are required' },
        { status: 400 }
      );
    }

    // Get patient information
    const patient = await Patient.findById(body.patientId);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Generate request number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await BloodTransfusion.countDocuments({
      createdAt: { $gte: new Date(today.setHours(0, 0, 0, 0)) }
    });
    const requestNumber = `BTR-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    // Calculate patient age
    const dob = patient.dateOfBirth ? new Date(patient.dateOfBirth) : null;
    const patientAge = dob ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : undefined;

    const transfusion = new BloodTransfusion({
      requestNumber,
      patientId: patient._id,
      patientName: patient.name,
      patientBloodGroup: body.patientBloodGroup || body.requestedBloodGroup,
      patientAge,
      patientGender: patient.gender,
      requestedBloodGroup: body.requestedBloodGroup,
      requestedComponent: body.requestedComponent,
      unitsRequested: body.unitsRequested,
      urgency: body.urgency || 'routine',
      reason: body.reason,
      diagnosis: body.diagnosis,
      hemoglobinLevel: body.hemoglobinLevel,
      plateletCount: body.plateletCount,
      previousTransfusions: body.previousTransfusions || 0,
      previousReactions: body.previousReactions || false,
      reactionHistory: body.reactionHistory,
      crossmatchStatus: 'pending',
      status: 'pending',
      requestedBy: session.user?.name || session.user?.email || 'Unknown',
      requestedByDepartment: body.requestedByDepartment || 'General',
      requestedAt: new Date(),
      createdBy: session.user?.email || 'Unknown',
    });

    await transfusion.save();

    return NextResponse.json(transfusion, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating transfusion request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create transfusion request';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
