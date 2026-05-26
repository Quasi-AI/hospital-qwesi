import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import WebsiteContent from '@/models/WebsiteContent';
import { getMergedWebsiteContent } from '@/lib/getWebsiteContent';

/** Public: merged website copy for the hospital one-pager */
export async function GET() {
  try {
    const content = await getMergedWebsiteContent();
    return NextResponse.json(content);
  } catch (error) {
    console.error('GET /api/website', error);
    return NextResponse.json({ error: 'Failed to load website content' }, { status: 500 });
  }
}

/** Admin only: replace CMS document */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const clean = { ...body };
    delete clean._id;
    delete clean.__v;
    delete clean.createdAt;
    delete clean.updatedAt;

    await dbConnect();
    await WebsiteContent.findOneAndUpdate({}, { $set: clean }, { upsert: true, new: true });

    const content = await getMergedWebsiteContent();
    return NextResponse.json({ ok: true, content });
  } catch (error) {
    console.error('PUT /api/website', error);
    return NextResponse.json({ error: 'Failed to save website content' }, { status: 500 });
  }
}
