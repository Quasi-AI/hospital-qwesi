import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import AIModel from '@/models/AIModel';

const HEALTH_KEYWORDS = [
  'pain',
  'fever',
  'cough',
  'headache',
  'dizzy',
  'dizziness',
  'vomit',
  'nausea',
  'rash',
  'bleeding',
  'pregnant',
  'pregnancy',
  'blood pressure',
  'diabetes',
  'heart',
  'chest',
  'breath',
  'asthma',
  'infection',
  'wound',
  'injury',
  'mental',
  'anxiety',
  'depression',
  'medicine',
  'medication',
  'symptom',
  'doctor',
  'clinic',
  'health',
  'medical',
  'stomach',
  'skin',
  'eye',
  'ear',
  'throat',
  'child',
  'baby',
  'urine',
  'kidney',
  'bone',
  'joint',
];

const SPECIALTY_SIGNALS: Array<{ specialty: string; terms: string[] }> = [
  { specialty: 'Cardiology', terms: ['chest', 'heart', 'palpitation', 'blood pressure', 'hypertension'] },
  { specialty: 'Pulmonology', terms: ['breath', 'cough', 'asthma', 'wheeze', 'lung'] },
  { specialty: 'Dermatology', terms: ['skin', 'rash', 'itch', 'acne', 'lesion'] },
  { specialty: 'Obstetrics and Gynecology', terms: ['pregnant', 'pregnancy', 'period', 'menstrual', 'vaginal'] },
  { specialty: 'Pediatrics', terms: ['child', 'baby', 'infant', 'toddler', 'pediatric'] },
  { specialty: 'Gastroenterology', terms: ['stomach', 'abdominal', 'vomit', 'nausea', 'diarrhea', 'constipation'] },
  { specialty: 'Neurology', terms: ['headache', 'migraine', 'seizure', 'numbness', 'weakness', 'dizzy'] },
  { specialty: 'Orthopedics', terms: ['bone', 'joint', 'fracture', 'sprain', 'back pain', 'knee'] },
  { specialty: 'Psychiatry', terms: ['anxiety', 'depression', 'mental', 'panic', 'sleep'] },
  { specialty: 'Urology', terms: ['urine', 'kidney', 'bladder', 'prostate'] },
  { specialty: 'ENT', terms: ['ear', 'nose', 'throat', 'sinus', 'tonsil'] },
  { specialty: 'Ophthalmology', terms: ['eye', 'vision', 'sight'] },
];

type DoctorCandidate = {
  _id: string;
  name: string;
  specialization?: string;
  department?: string;
  bio?: string;
};

function isHealthRelated(text: string) {
  const lower = text.toLowerCase();
  return HEALTH_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function inferSpecialties(text: string) {
  const lower = text.toLowerCase();
  return SPECIALTY_SIGNALS.filter((signal) => signal.terms.some((term) => lower.includes(term))).map(
    (signal) => signal.specialty
  );
}

function doctorScore(doctor: DoctorCandidate, text: string, inferredSpecialties: string[]) {
  const haystack = `${doctor.specialization || ''} ${doctor.department || ''} ${doctor.bio || ''}`.toLowerCase();
  let score = 0;
  inferredSpecialties.forEach((specialty) => {
    if (haystack.includes(specialty.toLowerCase())) score += 5;
  });
  SPECIALTY_SIGNALS.forEach((signal) => {
    if (signal.terms.some((term) => text.toLowerCase().includes(term)) && signal.terms.some((term) => haystack.includes(term))) {
      score += 2;
    }
  });
  if (!score && /general|family|primary|internal|medicine/i.test(haystack)) score = 1;
  return score;
}

function fallbackResponse(message: string, doctors: DoctorCandidate[]) {
  const inferredSpecialties = inferSpecialties(message);
  const ranked = doctors
    .map((doctor) => ({ doctor, score: doctorScore(doctor, message, inferredSpecialties) }))
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0)
    .slice(0, 3);

  const specialtyText = inferredSpecialties.length
    ? inferredSpecialties.join(', ')
    : 'a general practitioner or primary care doctor';

  return {
    reply:
      `This sounds like a health concern that may fit ${specialtyText}. I cannot diagnose you here, but you can share when it started, severity, medicines taken, and any red flags like chest pain, severe breathing trouble, fainting, heavy bleeding, or confusion. For urgent or severe symptoms, seek emergency care now.`,
    recommendedDoctors: ranked.map(({ doctor }) => ({
      id: doctor._id,
      name: doctor.name,
      specialization: doctor.specialization || doctor.department || 'Doctor',
      reason: doctor.specialization
        ? `Matches ${doctor.specialization} concerns from your message.`
        : 'Available for general clinical review.',
    })),
  };
}

async function askConfiguredModel(message: string, doctors: DoctorCandidate[]) {
  const activeModel = await AIModel.findOne({ isActive: true }).lean();
  if (!activeModel || activeModel.provider !== 'OpenAI' || !activeModel.apiKey || activeModel.apiKey === 'sk-...') {
    return null;
  }

  const doctorList = doctors
    .map(
      (doctor) =>
        `- ${doctor._id}: ${doctor.name} | ${doctor.specialization || doctor.department || 'Doctor'}`
    )
    .join('\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${activeModel.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: activeModel.model || 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content:
            'You are a patient portal health assistant. Only answer health-related questions. Do not diagnose. Give safe next steps and emergency red flags. Recommend up to 3 doctors only from the supplied list when their specialty fits. Return JSON only with keys reply and recommendedDoctorIds.',
        },
        {
          role: 'user',
          content: `Patient message: ${message}\n\nApproved doctors:\n${doctorList}`,
        },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    const parsed = JSON.parse(content);
    const ids = Array.isArray(parsed.recommendedDoctorIds) ? parsed.recommendedDoctorIds : [];
    return {
      reply: String(parsed.reply || '').trim(),
      recommendedDoctors: ids
        .map((id: string) => doctors.find((doctor) => doctor._id === id))
        .filter(Boolean)
        .slice(0, 3)
        .map((doctor: DoctorCandidate) => ({
          id: doctor._id,
          name: doctor.name,
          specialization: doctor.specialization || doctor.department || 'Doctor',
          reason: `Recommended based on ${doctor.specialization || doctor.department || 'clinical'} fit.`,
        })),
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized - Patient access only' }, { status: 401 });
    }

    const { message } = await request.json();
    const text = String(message || '').trim().slice(0, 2000);
    if (text.length < 2) {
      return NextResponse.json({ error: 'Please enter a health question.' }, { status: 400 });
    }

    if (!isHealthRelated(text)) {
      return NextResponse.json({
        reply: 'I can only help with health and care questions in the patient portal. Please ask about symptoms, medicines, appointments, or which type of doctor may fit your concern.',
        recommendedDoctors: [],
      });
    }

    await dbConnect();
    const doctors = await User.find({
      role: 'doctor',
      approvalStatus: 'approved',
      hasImage: true,
      licenseNumber: { $exists: true, $ne: '' },
      'licenseCertificate.data': { $exists: true, $ne: '' },
    })
      .select('_id name specialization department bio')
      .lean();

    const doctorCandidates = doctors.map((doctor: any) => ({
      _id: doctor._id.toString(),
      name: doctor.name,
      specialization: doctor.specialization,
      department: doctor.department,
      bio: doctor.bio,
    }));

    const aiResponse = await askConfiguredModel(text, doctorCandidates);
    return NextResponse.json(aiResponse || fallbackResponse(text, doctorCandidates));
  } catch (error: any) {
    console.error('Patient assistant error:', error);
    return NextResponse.json({ error: error.message || 'Assistant failed to respond' }, { status: 500 });
  }
}
