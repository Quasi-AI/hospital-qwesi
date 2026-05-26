import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Document from '@/models/Document';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const versionParam = searchParams.get('version');

    const document = await Document.findById(id);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check access control
    const userRole = session.user?.role || 'staff';
    const userId = session.user?.id;

    if (userRole === 'patient') {
      if (document.patientId?.toString() !== session.user?.patientId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else {
      const hasAccess = 
        document.accessControl?.isPublic ||
        document.accessControl?.allowedRoles?.includes(userRole) ||
        document.accessControl?.allowedUsers?.includes(userId) ||
        document.createdBy === session.user?.email;

      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Get the version to download
    const versionNumber = versionParam ? parseInt(versionParam) : document.currentVersion;
    const version = document.versions.find((v: { versionNumber: number }) => v.versionNumber === versionNumber);

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Check if file data exists
    if (!version.fileData) {
      return NextResponse.json({ error: 'No file data available' }, { status: 404 });
    }

    // Parse the data URL
    const matches = version.fileData.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json({ error: 'Invalid file data format' }, { status: 500 });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Return the file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(version.originalName)}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('Error downloading document:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to download document';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
