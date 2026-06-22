import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Patient from '@/models/Patient';
import PatientFamilyMember from '@/models/PatientFamilyMember';

async function getCurrentPatient(session: any) {
  const patient = await Patient.findOne({
    $or: [
      { _id: session.user.id },
      { email: session.user.email },
      { patientId: session.user.patientId },
    ].filter((condition: any) => Object.values(condition)[0]),
  }).lean() as any;

  return patient;
}

function ownerMatch(patient: any) {
  const keys = [String(patient._id), patient.patientId].filter(Boolean).map(String);
  return {
    $or: [
      { ownerPatientId: { $in: keys } },
      { ownerPatientEmail: patient.email },
    ],
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const patient = await getCurrentPatient(session);
    if (!patient) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
    }

    const members = await PatientFamilyMember.find(ownerMatch(patient))
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Patient family fetch error:', error);
    return NextResponse.json({ error: 'Failed to load family members' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const name = String(body.name || '').trim();
    const relationship = String(body.relationship || '').trim();

    if (!name || !relationship) {
      return NextResponse.json({ error: 'Name and relationship are required' }, { status: 400 });
    }

    await dbConnect();
    const patient = await getCurrentPatient(session);
    if (!patient) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
    }

    const member = await PatientFamilyMember.create({
      ownerPatientId: String(patient._id),
      ownerPatientEmail: patient.email,
      name,
      relationship,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
      phone: String(body.phone || '').trim(),
      email: String(body.email || '').trim().toLowerCase(),
      accessStatus: 'active',
      notes: String(body.notes || '').trim(),
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    console.error('Patient family create error:', error);
    return NextResponse.json({ error: 'Failed to add family member' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get('id') || '';
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Valid family member id is required' }, { status: 400 });
    }

    await dbConnect();
    const patient = await getCurrentPatient(session);
    if (!patient) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
    }

    const deleted = await PatientFamilyMember.findOneAndDelete({
      _id: id,
      ...ownerMatch(patient),
    });

    if (!deleted) {
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Family member removed' });
  } catch (error) {
    console.error('Patient family delete error:', error);
    return NextResponse.json({ error: 'Failed to remove family member' }, { status: 500 });
  }
}
