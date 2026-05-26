import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Admission from '@/models/Admission';
import Bed from '@/models/Bed';
import Ward from '@/models/Ward';

// GET - List all admissions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const wardId = searchParams.get('wardId');
    const patientId = searchParams.get('patientId');
    const doctorId = searchParams.get('doctorId');
    const priority = searchParams.get('priority');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    // Build query
    const query: Record<string, unknown> = {};
    
    if (status) {
      if (status === 'active') {
        query.status = { $nin: ['discharged', 'transferred', 'deceased', 'lama'] };
      } else {
        query.status = status;
      }
    }
    
    if (wardId) {
      query.wardId = wardId;
    }
    
    if (patientId) {
      query.patientId = patientId;
    }
    
    if (doctorId) {
      query.$or = [
        { admittingDoctorId: doctorId },
        { attendingDoctorId: doctorId }
      ];
    }
    
    if (priority) {
      query.priority = priority;
    }

    if (fromDate || toDate) {
      query.admissionDate = {};
      if (fromDate) {
        (query.admissionDate as Record<string, Date>).$gte = new Date(fromDate);
      }
      if (toDate) {
        (query.admissionDate as Record<string, Date>).$lte = new Date(toDate);
      }
    }

    const admissions = await Admission.find(query).sort({ admissionDate: -1 });

    return NextResponse.json(admissions);
  } catch (error) {
    console.error('Error fetching admissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admissions' },
      { status: 500 }
    );
  }
}

// POST - Create new admission
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const data = await request.json();

    // Check if bed is available
    const bed = await Bed.findById(data.bedId);
    if (!bed) {
      return NextResponse.json({ error: 'Bed not found' }, { status: 404 });
    }

    if (bed.status !== 'available') {
      return NextResponse.json(
        { error: 'Selected bed is not available' },
        { status: 400 }
      );
    }

    // Get ward info
    const ward = await Ward.findById(data.wardId);
    if (!ward) {
      return NextResponse.json({ error: 'Ward not found' }, { status: 404 });
    }

    // Generate admission number
    const count = (await Admission.countDocuments()) || 0;
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    const sequence = String(count + 1).padStart(5, '0');
    data.admissionNumber = `ADM-${year}${month}${day}-${sequence}`;

    // Set ward and bed info
    data.wardName = ward.name;
    data.bedNumber = bed.bedNumber;
    data.createdBy = session.user?.id;

    const admission = new Admission(data);
    await admission.save();

    // Update bed status
    await Bed.findByIdAndUpdate(data.bedId, {
      status: 'occupied',
      currentPatientId: data.patientId,
      currentPatientName: data.patientName,
      currentAdmissionId: admission._id
    });

    // Update ward counts
    await Ward.findByIdAndUpdate(data.wardId, {
      $inc: { occupiedBeds: 1, availableBeds: -1 }
    });

    return NextResponse.json(admission, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating admission:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create admission';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
