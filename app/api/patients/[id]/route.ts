import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Patient from '@/models/Patient';

const BLOOD_TYPES = new Set(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
const GENDERS = new Set(['male', 'female', 'other', 'prefer-not-to-say']);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const patient = await Patient.findById(id);
    
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(patient);
  } catch (error) {
    console.error('Error fetching patient:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patient' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const body = (await request.json()) as Record<string, unknown>;
    const { id } = await params;

    const patient = await Patient.findById(id);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    if (typeof body.name === 'string' && body.name.trim()) {
      patient.name = body.name.trim();
    }
    if (typeof body.email === 'string' && body.email.trim()) {
      patient.email = body.email.trim().toLowerCase();
    }
    if (typeof body.phone === 'string' && body.phone.trim()) {
      patient.phone = body.phone.trim();
    }
    if (body.dateOfBirth) {
      const d = new Date(String(body.dateOfBirth));
      if (!Number.isNaN(d.getTime())) {
        patient.dateOfBirth = d;
      }
    }
    if (typeof body.gender === 'string' && GENDERS.has(body.gender)) {
      patient.gender = body.gender as typeof patient.gender;
    }
    if (typeof body.address === 'string') {
      patient.address = body.address.trim() || undefined;
    }
    if (typeof body.assignedDoctor === 'string') {
      patient.assignedDoctor = body.assignedDoctor.trim() || undefined;
    }

    const bt = typeof body.bloodType === 'string' ? body.bloodType.trim() : '';
    if (bt && BLOOD_TYPES.has(bt)) {
      patient.bloodType = bt as NonNullable<(typeof patient)['bloodType']>;
    } else if (body.bloodType === '' || body.bloodType === null) {
      patient.set('bloodType', undefined);
    }

    if (typeof body.medicalHistory === 'string') {
      patient.medicalHistory = body.medicalHistory
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    } else if (Array.isArray(body.medicalHistory)) {
      patient.medicalHistory = body.medicalHistory.map(String).map((s) => s.trim()).filter(Boolean);
    }

    const ec = body.emergencyContact;
    if (ec && typeof ec === 'object' && ec !== null && !Array.isArray(ec)) {
      const o = ec as Record<string, unknown>;
      patient.emergencyContact = {
        name: typeof o.name === 'string' ? o.name.trim() : '',
        relationship: typeof o.relationship === 'string' ? o.relationship.trim() : '',
        phone: typeof o.phone === 'string' ? o.phone.trim() : '',
      };
    }

    await patient.save();

    return NextResponse.json(patient);
  } catch (error: unknown) {
    console.error('Error updating patient:', error);
    const err = error as { name?: string; code?: number; errors?: Record<string, { message: string }>; message?: string };
    if (err.name === 'ValidationError' && err.errors) {
      const details = Object.values(err.errors).map((e) => e.message);
      return NextResponse.json({ error: 'Validation failed', details }, { status: 400 });
    }
    if (err.code === 11000) {
      return NextResponse.json(
        { error: 'Duplicate entry', details: 'Another patient already uses this email.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update patient', details: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const patient = await Patient.findByIdAndDelete(id);
    
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    console.error('Error deleting patient:', error);
    return NextResponse.json(
      { error: 'Failed to delete patient' },
      { status: 500 }
    );
  }
}
