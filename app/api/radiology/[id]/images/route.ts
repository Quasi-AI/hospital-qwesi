import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import RadiologyStudy from '@/models/RadiologyStudy';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const formData = await request.formData();
    const files = formData.getAll('images') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadedImages = [];

    for (const file of files) {
      // Read file as base64
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${file.type};base64,${base64}`;

      const imageData = {
        filename: `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: dataUrl,
        uploadedAt: new Date(),
        uploadedBy: session.user?.name || session.user?.email || 'Unknown',
      };

      uploadedImages.push(imageData);
    }

    const study = await RadiologyStudy.findByIdAndUpdate(
      id,
      { $push: { images: { $each: uploadedImages } } },
      { new: true }
    );

    if (!study) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Images uploaded successfully', count: uploadedImages.length });
  } catch (error: unknown) {
    console.error('Error uploading images:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload images';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
