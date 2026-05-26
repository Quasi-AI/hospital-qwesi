import crypto from 'crypto';

function getSecret(): string {
  return (
    process.env.BOOKING_VERIFY_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'dev-only-change-in-production'
  );
}

export function signBookingVerificationToken(payload: { patientId: string; phoneKey: string }): string {
  const exp = Math.floor(Date.now() / 1000) + 60 * 45;
  const body = Buffer.from(JSON.stringify({ ...payload, exp }), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyBookingVerificationToken(token: string): { patientId: string; phoneKey: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [body, sig] = parts;
    const expected = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      patientId: string;
      phoneKey: string;
      exp: number;
    };
    if (typeof data.exp !== 'number' || data.exp < Math.floor(Date.now() / 1000)) return null;
    if (!data.patientId || !data.phoneKey) return null;
    return { patientId: data.patientId, phoneKey: data.phoneKey };
  } catch {
    return null;
  }
}
