import crypto from 'crypto';

export type RealtimeEventType =
  | 'notification.created'
  | 'notification.updated'
  | 'notification.deleted'
  | 'message.created'
  | 'telemedicine.session.created'
  | 'telemedicine.session.updated'
  | 'telemedicine.session.deleted'
  | 'telemedicine.chat.created';

export interface RealtimeTokenPayload {
  sub: string;
  role?: string;
  subjects: string[];
  exp: number;
  iat: number;
}

export interface RealtimeEvent<TPayload = unknown> {
  type: RealtimeEventType;
  targets: string[];
  payload: TPayload;
  createdAt?: string;
}

function getSecret() {
  return process.env.REALTIME_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key-here';
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString('base64url');
}

function signValue(value: string) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('base64url');
}

export function signRealtimeToken(payload: Omit<RealtimeTokenPayload, 'iat' | 'exp'>, ttlSeconds = 60 * 60) {
  const now = Math.floor(Date.now() / 1000);
  const body: RealtimeTokenPayload = {
    ...payload,
    subjects: Array.from(new Set(payload.subjects.filter(Boolean))),
    iat: now,
    exp: now + ttlSeconds,
  };
  const encoded = base64Url(JSON.stringify(body));
  return `${encoded}.${signValue(encoded)}`;
}

export function verifyRealtimeToken(token?: string | null): RealtimeTokenPayload | null {
  if (!token) return null;

  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;

  const expected = signValue(encoded);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as RealtimeTokenPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!Array.isArray(payload.subjects)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function realtimeSubjectsForSessionUser(user: {
  id?: string;
  role?: string;
  patientId?: string;
}) {
  const subjects = ['all'];
  const role = user.role || '';

  if (role) subjects.push(`role:${role}`);
  if (user.id) {
    subjects.push(`${role === 'patient' ? 'patient' : 'user'}:${user.id}`);
  }
  if (role === 'patient' && user.patientId) {
    subjects.push(`patient:${user.patientId}`);
  }

  return Array.from(new Set(subjects));
}

export function notificationTargets(notification: {
  recipientId?: string;
  recipientType?: 'user' | 'patient' | string;
}) {
  const targets = [];
  if (notification.recipientId && notification.recipientType) {
    targets.push(`${notification.recipientType}:${notification.recipientId}`);
  }
  return Array.from(new Set(targets));
}

export async function emitRealtimeEvent(event: RealtimeEvent) {
  const emitUrl =
    process.env.REALTIME_EMIT_URL ||
    `http://127.0.0.1:${process.env.REALTIME_PORT || '3001'}/emit`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    await fetch(emitUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-realtime-secret': getSecret(),
      },
      body: JSON.stringify({
        ...event,
        createdAt: event.createdAt || new Date().toISOString(),
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[realtime] emit skipped:', error instanceof Error ? error.message : error);
    }
  } finally {
    clearTimeout(timeout);
  }
}
