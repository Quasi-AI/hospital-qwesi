import { NextResponse } from 'next/server';

export async function GET() {
  const isDemo = process.env.DEMO === 'true';
  return NextResponse.json({ isDemo });
}

