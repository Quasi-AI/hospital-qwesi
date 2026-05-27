import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { realtimeSubjectsForSessionUser, signRealtimeToken } from '@/lib/realtime';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const subjects = realtimeSubjectsForSessionUser({
    id: session.user.id,
    role: session.user.role,
    patientId: session.user.patientId,
  });

  return NextResponse.json({
    token: signRealtimeToken({
      sub: session.user.id,
      role: session.user.role,
      subjects,
    }),
  });
}
