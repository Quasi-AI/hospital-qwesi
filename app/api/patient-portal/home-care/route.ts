import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import { getEffectiveProviderApprovalStatus } from '@/lib/providerApproval';
import HomeCareTask from '@/models/HomeCareTask';
import Patient from '@/models/Patient';
import User from '@/models/User';

const HOME_CARE_CATEGORIES = ['nursing', 'medication', 'wound-care', 'therapy', 'follow-up', 'other'];

async function getCurrentPatient(session: any) {
  return Patient.findOne({
    $or: [
      { _id: session.user.id },
      { email: session.user.email },
      { patientId: session.user.patientId },
    ].filter((condition: any) => Object.values(condition)[0]),
  }).lean() as any;
}

function patientTaskMatch(patient: any) {
  const keys = [String(patient._id), patient.patientId, patient.email].filter(Boolean).map(String);
  return {
    $or: [
      { patientId: { $in: keys } },
      { patientEmail: patient.email },
    ],
  };
}

async function loadApprovedHomeCareProviders() {
  const providers = await User.find({
    role: { $in: ['doctor', 'nurse'] },
    approvalStatus: 'approved',
  })
    .select('_id name email role image hasImage specialization department phone languages rating ratingCount approvalStatus licenseNumber licenseCertificate.fileName')
    .sort({ role: 1, name: 1 })
    .lean();

  return providers
    .filter((provider: any) => getEffectiveProviderApprovalStatus(provider) === 'approved')
    .map((provider: any) => ({
      _id: String(provider._id),
      name: provider.name,
      email: provider.email,
      role: provider.role,
      image: provider.image || '',
      specialization: provider.specialization,
      department: provider.department,
      phone: provider.phone,
      languages: provider.languages || [],
      rating: provider.rating,
      ratingCount: provider.ratingCount,
    }));
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

    const [tasks, providers] = await Promise.all([
      HomeCareTask.find(patientTaskMatch(patient)).sort({ dueAt: 1, createdAt: -1 }).limit(50).lean(),
      loadApprovedHomeCareProviders(),
    ]);

    return NextResponse.json({ tasks, providers });
  } catch (error) {
    console.error('Patient home care fetch error:', error);
    return NextResponse.json({ error: 'Failed to load home care' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const category = HOME_CARE_CATEGORIES.includes(String(body.category))
      ? String(body.category)
      : 'follow-up';
    const title = String(body.title || '').trim() || `${category.replace('-', ' ')} home-care request`;
    const notes = String(body.notes || '').trim();
    const assignedProviderId = String(body.assignedProviderId || '').trim();

    await dbConnect();
    const patient = await getCurrentPatient(session);
    if (!patient) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
    }

    let assignedTo = '';
    if (assignedProviderId) {
      if (!mongoose.Types.ObjectId.isValid(assignedProviderId)) {
        return NextResponse.json({ error: 'Selected provider is invalid' }, { status: 400 });
      }

      const provider = await User.findOne({
        _id: assignedProviderId,
        role: { $in: ['doctor', 'nurse'] },
        approvalStatus: 'approved',
      })
        .select('name role image hasImage licenseNumber licenseCertificate.fileName approvalStatus')
        .lean() as any;

      if (!provider || getEffectiveProviderApprovalStatus(provider) !== 'approved') {
        return NextResponse.json({ error: 'Selected provider is not available for home care' }, { status: 400 });
      }

      assignedTo = `${provider.role === 'nurse' ? 'Nurse' : 'Dr.'} ${provider.name}`;
    }

    const task = await HomeCareTask.create({
      patientId: String(patient._id),
      patientName: patient.name,
      patientEmail: patient.email,
      title,
      category,
      status: 'scheduled',
      dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
      assignedTo,
      notes,
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Patient home care create error:', error);
    return NextResponse.json({ error: 'Failed to request home care' }, { status: 500 });
  }
}
