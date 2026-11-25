import { NextRequest, NextResponse } from 'next/server';
import { detectFromRequest } from '@/lib/ipTimeZone';

/** Time zone and country guessed from the visitor's IP address (works before sign-in too). */
export async function GET(request: NextRequest) {
  return NextResponse.json(detectFromRequest(request.headers), { headers: { 'Cache-Control': 'no-store' } });
}
