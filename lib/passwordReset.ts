import crypto from 'crypto';

/**
 * Password-reset links. A token is signed with NEXTAUTH_SECRET and carries a fingerprint of the account's
 * CURRENT password hash, so it stops working as soon as the password changes (single use) and after 1 hour.
 */
const secret = () => process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || '';
const b64 = (s: string) => Buffer.from(s).toString('base64url');
const fingerprint = (hash?: string) => crypto.createHash('sha256').update(hash || 'none').digest('hex').slice(0, 16);
const sign = (body: string) => crypto.createHmac('sha256', secret()).update(body).digest('base64url');

export type ResetKind = 'user' | 'patient';

export function signResetToken(kind: ResetKind, id: string, passwordHash?: string, ttlMinutes = 60) {
  const body = b64(JSON.stringify({ k: kind, i: id, f: fingerprint(passwordHash), e: Date.now() + ttlMinutes * 60_000 }));
  return `${body}.${sign(body)}`;
}

export function readResetToken(token: string): { kind: ResetKind; id: string; f: string } | null {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig || !secret()) return null;
  const expected = sign(body);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const { k, i, f, e } = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!i || (k !== 'user' && k !== 'patient') || !(e > Date.now())) return null;
    return { kind: k, id: String(i), f: String(f) };
  } catch {
    return null;
  }
}

export const resetFingerprint = fingerprint;
