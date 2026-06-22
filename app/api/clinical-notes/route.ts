import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import ClinicalNote from '@/models/ClinicalNote';
import Patient from '@/models/Patient';
import User from '@/models/User';

function canUseClinicalNotes(role?: string | null) {
  return ['admin', 'doctor', 'staff', 'nurse'].includes(role || '');
}

function noteVisibilityQuery(session: any, patientId?: string | null) {
  const base: any = {};
  if (patientId && mongoose.Types.ObjectId.isValid(patientId)) {
    base.patientId = new mongoose.Types.ObjectId(patientId);
  }

  if (session.user.role === 'admin' || session.user.role === 'staff') {
    return base;
  }

  return {
    ...base,
    $or: [
      { providerId: session.user.id },
      { sharedWith: session.user.id },
      { createdBy: session.user.id },
    ],
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !canUseClinicalNotes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const query = noteVisibilityQuery(session, patientId);

    const notes = await ClinicalNote.find(query)
      .populate('sharedWith', 'name email role image')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Clinical notes fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch clinical notes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !canUseClinicalNotes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    if (!body.patientId || !mongoose.Types.ObjectId.isValid(body.patientId)) {
      return NextResponse.json({ error: 'Valid patientId is required' }, { status: 400 });
    }
    if (!body.chiefComplaint?.trim()) {
      return NextResponse.json({ error: 'Chief complaint is required' }, { status: 400 });
    }

    await dbConnect();
    const patient = await Patient.findById(body.patientId).lean();
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const currentUser = await User.findById(session.user.id).select('name role').lean();
    const sharedWith = Array.isArray(body.sharedWith)
      ? body.sharedWith.filter((id: string) => mongoose.Types.ObjectId.isValid(id))
      : [];

    const note = await ClinicalNote.create({
      patientId: patient._id,
      patientName: patient.name,
      patientDisplayId: patient.patientId,
      encounterDate: body.encounterDate ? new Date(body.encounterDate) : new Date(),
      encounterType: body.encounterType || 'video',
      noteType: body.noteType || 'full-soap',
      providerId: session.user.id,
      providerName: currentUser?.name || session.user.name || session.user.email,
      providerRole:
        session.user.role === 'doctor'
          ? 'doctor'
          : session.user.role === 'nurse'
            ? 'nurse'
            : session.user.role === 'admin'
              ? 'admin'
              : 'staff',
      chiefComplaint: body.chiefComplaint,
      subjective: body.subjective || '',
      objective: body.objective || '',
      assessment: body.assessment || '',
      plan: body.plan || '',
      redFlags: body.redFlags || {},
      triageLevel: body.triageLevel || 'green',
      followUpPlan: body.followUpPlan || '',
      emergencyPrecautions:
        body.emergencyPrecautions ||
        'Seek emergency care for worsening symptoms, difficulty breathing, chest pain, fainting, severe bleeding, confusion, seizure, persistent vomiting, pregnancy bleeding, severe abdominal pain, suicidal thoughts, or any danger sign.',
      patientUnderstanding: !!body.patientUnderstanding,
      consentForVirtualCare: !!body.consentForVirtualCare,
      sharedWith,
      createdBy: session.user.id,
    });

    const populated = await ClinicalNote.findById(note._id).populate('sharedWith', 'name email role image').lean();
    return NextResponse.json({ note: populated }, { status: 201 });
  } catch (error) {
    console.error('Clinical note create error:', error);
    return NextResponse.json({ error: 'Failed to create clinical note' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !canUseClinicalNotes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const id = request.nextUrl.searchParams.get('id') || '';
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Valid note id is required' }, { status: 400 });
    }

    await dbConnect();
    const note = await ClinicalNote.findById(id);
    if (!note) {
      return NextResponse.json({ error: 'Clinical note not found' }, { status: 404 });
    }

    const canDelete =
      ['admin', 'staff'].includes(session.user.role || '') ||
      String(note.providerId) === String(session.user.id) ||
      String(note.createdBy) === String(session.user.id);

    if (!canDelete) {
      return NextResponse.json({ error: 'You can only delete notes you created' }, { status: 403 });
    }

    await note.deleteOne();
    return NextResponse.json({ message: 'Clinical note deleted' });
  } catch (error) {
    console.error('Clinical note delete error:', error);
    return NextResponse.json({ error: 'Failed to delete clinical note' }, { status: 500 });
  }
}
