import mongoose from 'mongoose';
import Patient from '@/models/Patient';
import User from '@/models/User';

export function participantKey(parts: { entityType: string; entityId: string }[]) {
  return parts
    .map((p) => `${p.entityType}:${p.entityId}`)
    .sort()
    .join('|');
}

export async function currentMessagingParticipant(session: any) {
  if (session.user.role === 'patient') {
    const patient = await Patient.findOne({ email: session.user.email }).select('name email').lean();
    if (!patient) return null;
    return {
      entityType: 'patient' as const,
      entityId: patient._id,
      role: 'patient' as const,
      name: patient.name,
      email: patient.email,
      image: '',
    };
  }

  const user = await User.findById(session.user.id).select('name email role image').lean();
  if (!user) return null;
  return {
    entityType: 'user' as const,
    entityId: new mongoose.Types.ObjectId(String(user._id)),
    role: user.role,
    name: user.name,
    email: user.email,
    image: user.image || '',
  };
}
