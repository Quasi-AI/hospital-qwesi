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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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

      // Patients are auto-approved on signup — unlike doctors/nurses/
      // pharmacy staff, there's no license or credential to verify, so
      // requiring an admin to manually approve every patient account just
      // blocked people from logging in right after signing up (they'd see
      // "invalid password" since the account wasn't approved yet, then hit
      // "account already exists" if they tried to sign up again). An admin
      // can still suspend/reject a specific patient account later via
      // /api/patients/[id]/approval if genuinely needed.
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
        approvalStatus: 'approved',
        approvedAt: new Date(),
        agreement: signedAgreement,
      });

      await User.create({
        name,
        email,
        password: hashedPassword,
        role: 'patient',
        approvalStatus: 'approved',
        approvedAt: new Date(),
        agreement: signedAgreement,
      });

      return NextResponse.json({
        message: 'Account created! You can log in right away.',
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
