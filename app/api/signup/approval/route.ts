import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import Patient from '@/models/Patient';
import User from '@/models/User';

type SignupRole = 'patient' | 'doctor' | 'nurse' | 'pharmacy';
const AGREEMENT_VERSION = 'health-platform-agreement-2026-06';

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

async function nextPatientId() {
  const lastPatient = await Patient.findOne({}, { patientId: 1 }).sort({ patientId: -1 }).lean() as any;
  const lastNumber = lastPatient?.patientId?.match(/PAT-(\d+)/)?.[1];
  const nextId = lastNumber ? Number(lastNumber) + 1 : 1;
  return `PAT-${String(nextId).padStart(4, '0')}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const role = cleanText(body.role).toLowerCase() as SignupRole;
    const name = cleanText(body.name);
    const email = cleanText(body.email).toLowerCase();
    const password = cleanText(body.password);
    const phone = cleanText(body.phone);
    const agreement = body.agreement || {};
    const signedName = cleanText(agreement.signedName);

    if (!['patient', 'doctor', 'nurse', 'pharmacy'].includes(role)) {
      return NextResponse.json({ error: 'Select patient, doctor, nurse, or pharmacy.' }, { status: 400 });
    }
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
    }
    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }
    if (
      !agreement.termsAccepted ||
      !agreement.privacyAccepted ||
      !agreement.healthConsentAccepted ||
      !agreement.telemedicineConsentAccepted ||
      !signedName
    ) {
      return NextResponse.json(
        { error: 'Please review and sign the privacy, terms, healthcare consent, and telemedicine agreement.' },
        { status: 400 }
      );
    }

    const signedAgreement = {
      version: AGREEMENT_VERSION,
      termsAccepted: true,
      privacyAccepted: true,
      healthConsentAccepted: true,
      telemedicineConsentAccepted: true,
      signedName,
      signedAt: new Date(),
      userAgent: request.headers.get('user-agent') || '',
    };

    await dbConnect();

    const [existingUser, existingPatient] = await Promise.all([
      User.findOne({ email }),
      Patient.findOne({ email }),
    ]);
    if (existingUser || existingPatient) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    if (role === 'patient') {
      const dateOfBirth = cleanText(body.dateOfBirth);
      const gender = cleanText(body.gender);
      if (!phone || !dateOfBirth || !gender) {
        return NextResponse.json({ error: 'Phone, date of birth, and gender are required for patients.' }, { status: 400 });
      }

      const patient = await Patient.create({
        patientId: await nextPatientId(),
        name,
        email,
        phone,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        address: cleanText(body.address) || undefined,
        medicalHistory: [],
        allergies: [],
        currentMedications: [],
        password: hashedPassword,
        approvalStatus: 'pending_verification',
        agreement: signedAgreement,
      });

      await User.create({
        name,
        email,
        password: hashedPassword,
        role: 'patient',
        approvalStatus: 'pending_verification',
        agreement: signedAgreement,
      });

      return NextResponse.json({
        message: 'Patient signup submitted for approval.',
        id: patient._id,
        role,
      }, { status: 201 });
    }

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      phone: phone || undefined,
      department: cleanText(body.department) || (role === 'nurse' ? 'Nursing' : role === 'pharmacy' ? 'Pharmacy' : undefined),
      specialization: cleanText(body.specialization) || undefined,
      licenseNumber: cleanText(body.licenseNumber) || undefined,
      yearsOfExperience: body.yearsOfExperience ? Number(body.yearsOfExperience) : undefined,
      approvalStatus: 'pending_profile',
      agreement: signedAgreement,
      licenseVerification: {
        status: 'not_started',
        method: 'manual',
        message: 'Waiting for profile photo, license number, and license certificate upload.',
      },
    });

    return NextResponse.json({
      message: `${role === 'doctor' ? 'Doctor' : role === 'nurse' ? 'Nurse' : 'Pharmacy'} signup submitted for approval.`,
      id: user._id,
      role,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Approval signup error:', error);
    if (error?.code === 11000) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to submit signup request.' }, { status: 500 });
  }
}
