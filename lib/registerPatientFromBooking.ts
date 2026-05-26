import bcrypt from 'bcryptjs';
import Patient from '@/models/Patient';
import User from '@/models/User';

const GENDERS = new Set(['male', 'female', 'other', 'prefer-not-to-say']);

export type RegisterPatientResult =
  | { ok: true; patientId: string }
  | { ok: false; error: string; status: number };

/**
 * Creates Patient + User (patient role) for public booking when user opts into portal access.
 * Caller must ensure email is not already a staff User conflict.
 */
export async function registerPatientFromBooking(params: {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  password: string;
}): Promise<RegisterPatientResult> {
  const name = params.name.trim();
  const email = params.email.trim().toLowerCase();
  const phone = params.phone.trim();
  const password = params.password;
  const gender = params.gender.trim().toLowerCase();

  if (password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters', status: 400 };
  }
  if (!GENDERS.has(gender)) {
    return { ok: false, error: 'Please select a valid gender option', status: 400 };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.dateOfBirth)) {
    return { ok: false, error: 'Invalid date of birth', status: 400 };
  }
  const dob = new Date(`${params.dateOfBirth}T12:00:00.000Z`);
  if (Number.isNaN(dob.getTime())) {
    return { ok: false, error: 'Invalid date of birth', status: 400 };
  }

  const existingPatient = await Patient.findOne({ email }).select('_id').lean();
  if (existingPatient) {
    return {
      ok: false,
      error: 'An account with this email already exists. Use Returning patient or sign in.',
      status: 409,
    };
  }

  const existingStaffUser = await User.findOne({ email }).select('role').lean();
  if (existingStaffUser && (existingStaffUser as { role?: string }).role !== 'patient') {
    return {
      ok: false,
      error: 'This email is already registered with a different role. Please use another email.',
      status: 409,
    };
  }

  let patientIdStr = '';
  try {
    const lastPatient = await Patient.findOne({}, { patientId: 1 }).sort({ patientId: -1 });
    let nextId = 1;
    if (lastPatient?.patientId) {
      const match = lastPatient.patientId.match(/PAT-(\d+)/);
      if (match) nextId = parseInt(match[1], 10) + 1;
    }
    patientIdStr = `PAT-${nextId.toString().padStart(4, '0')}`;
  } catch {
    patientIdStr = `PAT-${Date.now().toString().slice(-6)}`;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const patient = new Patient({
    patientId: patientIdStr,
    name,
    email,
    phone,
    dateOfBirth: dob,
    gender,
    medicalHistory: [],
    allergies: [],
    currentMedications: [],
    password: hashedPassword,
  });

  try {
    await patient.save();
  } catch (e: unknown) {
    const err = e as { code?: number };
    if (err.code === 11000) {
      return { ok: false, error: 'This email or patient record already exists.', status: 409 };
    }
    throw e;
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.role === 'patient') {
        existingUser.password = hashedPassword;
        await existingUser.save();
      }
    } else {
      await User.create({
        email,
        name,
        password: hashedPassword,
        role: 'patient',
      });
    }
  } catch (userErr) {
    console.error('registerPatientFromBooking: User sync failed', userErr);
  }

  return { ok: true, patientId: String(patient._id) };
}
