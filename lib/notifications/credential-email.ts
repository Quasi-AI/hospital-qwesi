import Settings from '@/models/Settings';
import dbConnect from '@/lib/mongodb';
import { sendEmail } from './email-provider';

type CredentialRole = 'admin' | 'doctor' | 'staff' | 'patient';

function roleLabel(role: CredentialRole) {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'doctor':
      return 'Doctor';
    case 'staff':
      return 'Staff';
    case 'patient':
      return 'Patient';
    default:
      return 'User';
  }
}

function appUrl() {
  return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

async function clinicName() {
  try {
    await dbConnect();
    const settings = await Settings.findOne({}).select('systemTitle').lean();
    return settings?.systemTitle || 'Qwesi Virtual Hospital';
  } catch {
    return 'Qwesi Virtual Hospital';
  }
}

export async function sendCredentialEmail({
  to,
  name,
  password,
  role,
}: {
  to: string;
  name: string;
  password: string;
  role: CredentialRole;
}) {
  const clinic = await clinicName();
  const label = roleLabel(role);
  const loginUrl = `${appUrl().replace(/\/$/, '')}/login`;

  return sendEmail({
    to,
    subject: `${clinic} ${label} login details`,
    text: [
      `Hello ${name},`,
      '',
      `Your ${clinic} ${label.toLowerCase()} account has been created.`,
      `Login: ${loginUrl}`,
      `Email: ${to}`,
      `Temporary password: ${password}`,
      '',
      'Please sign in and change your password from your profile as soon as possible.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5; padding: 20px;">
        <h2 style="margin: 0 0 12px; color: #0f766e;">${clinic} login details</h2>
        <p>Hello ${name},</p>
        <p>Your ${label.toLowerCase()} account has been created. Use the temporary password below to sign in.</p>
        <div style="border: 1px solid #d1d5db; border-radius: 8px; padding: 14px; background: #f9fafb; margin: 16px 0;">
          <p style="margin: 0 0 8px;"><strong>Login:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
          <p style="margin: 0 0 8px;"><strong>Email:</strong> ${to}</p>
          <p style="margin: 0;"><strong>Temporary password:</strong> <span style="font-family: monospace;">${password}</span></p>
        </div>
        <p>Please change your password from your profile after signing in.</p>
      </div>
    `,
  });
}
