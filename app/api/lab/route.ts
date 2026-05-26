import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '../../../lib/mongodb';
import LabTest from '../../../models/LabTest';

// GET - List all lab tests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const category = searchParams.get('category');
    const patientId = searchParams.get('patientId');
    const search = searchParams.get('search');
    const isCritical = searchParams.get('isCritical');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    const query: any = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    if (category && category !== 'all') {
      query.testCategory = category;
    }

    if (patientId) {
      query.patientId = patientId;
    }

    if (search) {
      query.$or = [
        { testNumber: { $regex: search, $options: 'i' } },
        { patientName: { $regex: search, $options: 'i' } },
        { testType: { $regex: search, $options: 'i' } },
        { doctorName: { $regex: search, $options: 'i' } },
      ];
    }

    if (isCritical === 'true') {
      query.isCritical = true;
    }

    const skip = (page - 1) * limit;

    const [labTests, total] = await Promise.all([
      LabTest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LabTest.countDocuments(query),
    ]);

    return NextResponse.json({
      labTests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching lab tests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lab tests' },
      { status: 500 }
    );
  }
}

// POST - Create a new lab test order
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    // Generate test number
    const count = await LabTest.countDocuments() || 0;
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    const sequence = String(count + 1).padStart(5, '0');
    const testNumber = `LAB-${year}${month}${day}-${sequence}`;

    const labTest = new LabTest({
      ...body,
      testNumber,
      createdBy: session.user?.email || 'system',
    });

    await labTest.save();

    return NextResponse.json(labTest, { status: 201 });
  } catch (error: any) {
    console.error('Error creating lab test:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create lab test' },
      { status: 500 }
    );
  }
}
