import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
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
    const includeFile = searchParams.get('includeFile') === 'true';
    const version = searchParams.get('version');

    const document = await Document.findById(id);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check access control
    const userRole = session.user?.role || 'staff';
    const userId = session.user?.id;

    if (userRole === 'patient') {
      // Patients can only see their own documents
      if (document.patientId?.toString() !== session.user?.patientId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else {
      // Check role-based access
      const hasAccess = 
        document.accessControl?.isPublic ||
        document.accessControl?.allowedRoles?.includes(userRole) ||
        document.accessControl?.allowedUsers?.includes(userId) ||
        document.createdBy === session.user?.email;

      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Return response
    const response = document.toObject();

    if (!includeFile) {
      // Remove file data if not requested
      response.versions = response.versions.map((v: { versionNumber: number; filename: string; originalName: string; mimeType: string; size: number; uploadedAt: Date; uploadedBy: string; notes?: string; fileData?: string }) => ({
        ...v,
        fileData: undefined,
      }));
    } else if (version) {
      // Only include file data for specific version
      const versionNum = parseInt(version);
      response.versions = response.versions.map((v: { versionNumber: number; filename: string; originalName: string; mimeType: string; size: number; uploadedAt: Date; uploadedBy: string; notes?: string; fileData?: string }) => ({
        ...v,
        fileData: v.versionNumber === versionNum ? v.fileData : undefined,
      }));
    }

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('Error fetching document:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch document';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(
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

    const document = await Document.findById(id);
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if user can edit
    const userRole = session.user?.role || 'staff';
    if (!['admin', 'doctor'].includes(userRole) && document.createdBy !== session.user?.email) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const patientId = formData.get('patientId') as string;
    const patientName = formData.get('patientName') as string;
    const doctorId = formData.get('doctorId') as string;
    const doctorName = formData.get('doctorName') as string;
    const status = formData.get('status') as string;
    const priority = formData.get('priority') as string;
    const expiryDate = formData.get('expiryDate') as string;
    const tagsStr = formData.get('tags') as string;
    const notes = formData.get('notes') as string;
    const accessControlStr = formData.get('accessControl') as string;
    const versionNotes = formData.get('versionNotes') as string;

    // Update basic fields
    if (title) document.title = title;
    if (description !== undefined) document.description = description;
    if (category) document.category = category as typeof document.category;
    if (patientId !== undefined) document.patientId = patientId || undefined;
    if (patientName !== undefined) document.patientName = patientName;
    if (doctorId !== undefined) document.doctorId = doctorId || undefined;
    if (doctorName !== undefined) document.doctorName = doctorName;
    if (status) document.status = status as typeof document.status;
    if (priority) document.priority = priority as typeof document.priority;
    if (expiryDate !== undefined) document.expiryDate = expiryDate ? new Date(expiryDate) : undefined;
    if (tagsStr) document.tags = JSON.parse(tagsStr);
    if (notes !== undefined) document.notes = notes;
    if (accessControlStr) document.accessControl = JSON.parse(accessControlStr);

    // Handle file upload (new version)
    if (file) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString('base64');
      const fileData = `data:${file.type};base64,${base64}`;

      const newVersionNumber = document.currentVersion + 1;

      document.versions.push({
        versionNumber: newVersionNumber,
        filename: `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        fileData,
        uploadedAt: new Date(),
        uploadedBy: session.user?.name || session.user?.email || 'Unknown',
        notes: versionNotes || `Version ${newVersionNumber}`,
      });

      document.currentVersion = newVersionNumber;
    }

    await document.save();

    // Return without file data
    const response = document.toObject();
    response.versions = response.versions.map((v: { versionNumber: number; filename: string; originalName: string; mimeType: string; size: number; uploadedAt: Date; uploadedBy: string; notes?: string; fileData?: string }) => ({
      ...v,
      fileData: undefined,
    }));

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('Error updating document:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update document';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
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

    const document = await Document.findById(id);
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Only admin and document creator can delete
    const userRole = session.user?.role || 'staff';
    if (userRole !== 'admin' && document.createdBy !== session.user?.email) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    await Document.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting document:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete document';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
