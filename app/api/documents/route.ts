import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Document from '@/models/Document';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const patientId = searchParams.get('patientId');
    const search = searchParams.get('search');

    // Build query
    const query: Record<string, unknown> = {};

    if (category && category !== 'all') {
      query.category = category;
    }
    if (status && status !== 'all') {
      query.status = status;
    }
    if (patientId) {
      query.patientId = patientId;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { documentNumber: { $regex: search, $options: 'i' } },
        { patientName: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    // Access control based on user role
    const userRole = session.user?.role || 'staff';
    const userId = session.user?.id;

    // If user is a patient, only show their documents
    if (userRole === 'patient') {
      query.patientId = session.user?.patientId;
    } else {
      // For staff, check if document is accessible
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { 'accessControl.isPublic': true },
          { 'accessControl.allowedRoles': userRole },
          { 'accessControl.allowedUsers': userId },
          { createdBy: session.user?.email },
        ],
      });
    }

    // Exclude file data from list response to reduce payload
    const documents = await Document.find(query)
      .select('-versions.fileData')
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json(documents);
  } catch (error: unknown) {
    console.error('Error fetching documents:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch documents';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const patientId = formData.get('patientId') as string;
    const patientName = formData.get('patientName') as string;
    const doctorId = formData.get('doctorId') as string;
    const doctorName = formData.get('doctorName') as string;
    const status = formData.get('status') as string || 'active';
    const priority = formData.get('priority') as string || 'normal';
    const expiryDate = formData.get('expiryDate') as string;
    const tagsStr = formData.get('tags') as string;
    const notes = formData.get('notes') as string;
    const accessControlStr = formData.get('accessControl') as string;

    // Validate required fields
    if (!title || !category) {
      return NextResponse.json(
        { error: 'Title and category are required' },
        { status: 400 }
      );
    }

    // Parse tags and access control
    const tags = tagsStr ? JSON.parse(tagsStr) : [];
    const accessControl = accessControlStr 
      ? JSON.parse(accessControlStr) 
      : { isPublic: false, allowedRoles: ['admin', 'doctor', 'staff'], allowedUsers: [] };

    // Process file if provided
    let versions: Array<{
      versionNumber: number;
      filename: string;
      originalName: string;
      mimeType: string;
      size: number;
      fileData: string;
      uploadedAt: Date;
      uploadedBy: string;
      notes?: string;
    }> = [];

    if (file) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString('base64');
      const fileData = `data:${file.type};base64,${base64}`;

      versions.push({
        versionNumber: 1,
        filename: `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        fileData,
        uploadedAt: new Date(),
        uploadedBy: session.user?.name || session.user?.email || 'Unknown',
        notes: 'Initial upload',
      });
    }

    // Generate document number
    const count = await Document.countDocuments();
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const documentNumber = `DOC-${year}${month}-${(count + 1).toString().padStart(5, '0')}`;

    const document = new Document({
      documentNumber,
      title,
      description,
      category,
      patientId: patientId || undefined,
      patientName,
      doctorId: doctorId || undefined,
      doctorName,
      status,
      priority,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      tags,
      accessControl,
      currentVersion: versions.length > 0 ? 1 : 0,
      versions,
      notes,
      createdBy: session.user?.email || 'Unknown',
    });

    await document.save();

    // Return without file data
    const response = document.toObject();
    if (response.versions) {
      response.versions = response.versions.map((v: { versionNumber: number; filename: string; originalName: string; mimeType: string; size: number; uploadedAt: Date; uploadedBy: string; notes?: string }) => ({
        ...v,
        fileData: undefined,
      }));
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating document:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create document';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
