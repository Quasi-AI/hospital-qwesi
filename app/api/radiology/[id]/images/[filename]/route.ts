import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import RadiologyStudy from '@/models/RadiologyStudy';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, filename } = await params;
    await dbConnect();

    const study = await RadiologyStudy.findByIdAndUpdate(
      id,
      { $pull: { images: { filename: decodeURIComponent(filename) } } },
      { new: true }
    );

    if (!study) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Image deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete image';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
