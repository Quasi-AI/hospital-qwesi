import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import TelemedicineSession from '@/models/TelemedicineSession';
import Patient from '@/models/Patient';
import User from '@/models/User';
import Appointment from '@/models/Appointment';
import { getSystemCurrency } from '@/lib/getSystemCurrency';

// GET - List all telemedicine sessions with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const consultationType = searchParams.get('consultationType');
    const doctorId = searchParams.get('doctorId');
    const patientId = searchParams.get('patientId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const upcoming = searchParams.get('upcoming');
    const today = searchParams.get('today');

    // Build query: admin and staff see all sessions; doctor sees only their own
    const query: any = {};

    if (session.user.role === 'doctor') {
      const doctorUser = await User.findOne({ email: session.user.email });
      if (doctorUser) {
        query.doctorId = doctorUser._id;
      }
    }
    // admin and staff: no doctorId filter → all telemedicine sessions

    if (status) {
      query.status = status;
    }

    if (consultationType) {
      query.consultationType = consultationType;
    }

    // Only allow doctorId filter for non-doctor users (admin/staff)
    if (doctorId && session.user.role !== 'doctor') {
      query.doctorId = doctorId;
    }

    if (patientId) {
      query.patientId = patientId;
    }

    if (startDate || endDate) {
      query.scheduledStartTime = {};
      if (startDate) {
        query.scheduledStartTime.$gte = new Date(startDate);
      }
      if (endDate) {
        query.scheduledStartTime.$lte = new Date(endDate);
      }
    }

    // Today's sessions
    if (today === 'true') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      query.scheduledStartTime = {
        $gte: todayStart,
        $lte: todayEnd,
      };
    }

    // Upcoming sessions
    if (upcoming === 'true') {
      query.scheduledStartTime = { $gte: new Date() };
      query.status = { $in: ['scheduled', 'waiting'] };
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Execute query with population
    const [sessions, total] = await Promise.all([
      TelemedicineSession.find(query)
        .populate('patientId', 'name email phone patientId')
        .populate({ path: 'doctorId', model: User, select: 'name email specialization' })
        .populate('appointmentId', 'appointmentNumber')
        .sort({ scheduledStartTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TelemedicineSession.countDocuments(query),
    ]);

    // Build stats match filter (same as query filter for doctor)
    const statsMatch: any = {};
    if (query.doctorId) {
      statsMatch.doctorId = query.doctorId;
    }

    // Get statistics
    const stats = await TelemedicineSession.aggregate([
      { $match: statsMatch },
      {
        $facet: {
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          byType: [
            { $group: { _id: '$consultationType', count: { $sum: 1 } } }
          ],
          todayCount: [
            {
              $match: {
                scheduledStartTime: {
                  $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                  $lte: new Date(new Date().setHours(23, 59, 59, 999)),
                }
              }
            },
            { $count: 'count' }
          ],
          inProgress: [
            { $match: { status: 'in-progress' } },
            { $count: 'count' }
          ],
          waiting: [
            { $match: { status: 'waiting' } },
            { $count: 'count' }
          ],
        }
      }
    ]);

    return NextResponse.json({
      sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        byStatus: stats[0].byStatus,
        byType: stats[0].byType,
        todayCount: stats[0].todayCount[0]?.count || 0,
        inProgress: stats[0].inProgress[0]?.count || 0,
        waiting: stats[0].waiting[0]?.count || 0,
      }
    });
  } catch (error) {
    console.error('Error fetching telemedicine sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch telemedicine sessions' },
      { status: 500 }
    );
  }
}

// POST - Create a new telemedicine session
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const data = await request.json();

    // Validate required fields
    if (!data.patientId || !data.doctorId || !data.scheduledStartTime) {
      return NextResponse.json(
        { error: 'Patient, doctor, and scheduled start time are required' },
        { status: 400 }
      );
    }

    // Verify patient exists
    const patient = await Patient.findById(data.patientId);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Verify doctor exists (doctors are users with role 'doctor')
    const doctor = await User.findById(data.doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    // Calculate end time if not provided (default 30 minutes)
    const scheduledStartTime = new Date(data.scheduledStartTime);
    const scheduledEndTime = data.scheduledEndTime 
      ? new Date(data.scheduledEndTime)
      : new Date(scheduledStartTime.getTime() + 30 * 60 * 1000);

    // Generate session number and room ID
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await TelemedicineSession.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    });
    const sessionNumber = `TM-${dateStr}-${String(count + 1).padStart(4, '0')}`;
    const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const systemCurrency = await getSystemCurrency();

    // Create session
    const telemedicineSession = new TelemedicineSession({
      sessionNumber,
      roomId,
      patientId: data.patientId,
      doctorId: data.doctorId,
      appointmentId: data.appointmentId,
      scheduledStartTime,
      scheduledEndTime,
      consultationType: data.consultationType || 'video',
      status: 'scheduled',
      chiefComplaint: data.chiefComplaint,
      consultationFee: data.consultationFee || doctor.consultationFee || 0,
      currency: data.currency || systemCurrency,
      participants: [
        {
          odId: data.patientId,
          odType: 'patient',
          name: patient.name,
          connectionStatus: 'waiting',
        },
        {
          odId: data.doctorId,
          odType: 'doctor',
          name: doctor.name,
          connectionStatus: 'waiting',
        }
      ],
      createdBy: session.user.id,
    });

    await telemedicineSession.save();

    // Update appointment if linked
    if (data.appointmentId) {
      await Appointment.findByIdAndUpdate(data.appointmentId, {
        telemedicineSessionId: telemedicineSession._id,
        consultationType: 'telemedicine',
      });
    }

    // Populate and return
    const populatedSession = await TelemedicineSession.findById(telemedicineSession._id)
      .populate('patientId', 'name email phone patientId')
      .populate({ path: 'doctorId', model: User, select: 'name email specialization' })
      .lean();

    return NextResponse.json(populatedSession, { status: 201 });
  } catch (error) {
    console.error('Error creating telemedicine session:', error);
    return NextResponse.json(
      { error: 'Failed to create telemedicine session' },
      { status: 500 }
    );
  }
}
