import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

/** Serves an approved doctor's profile photo (stored as a data URI) as a cacheable image. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await dbConnect();
    const doctor = await User.findOne({ _id: id, role: 'doctor', approvalStatus: { $ne: 'rejected' } })
      .select('image')
      .lean<{ image?: string }>();

    const match = doctor?.image?.match(/^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/i);
    if (!match) return new NextResponse(null, { status: 404 });

    return new NextResponse(Buffer.from(match[2], 'base64'), {
      headers: {
        'Content-Type': match[1],
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
