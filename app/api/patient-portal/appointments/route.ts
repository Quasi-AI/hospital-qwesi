import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '../../../../lib/mongodb';
import Appointment from '../../../../models/Appointment';
import TelemedicineSession from '../../../../models/TelemedicineSession';
import Patient from '../../../../models/Patient';
import User from '../../../../models/User';
import { normalizeAppointmentDateForStorage, normalizeTimeLabel, isSlotAvailableForDoctor } from '@/lib/appointmentSlotting';
import { getSystemCurrency } from '@/lib/getSystemCurrency';
import { createNotification, scheduleAppointmentReminder } from '@/lib/notifications/notification-service';
import { emitRealtimeEvent } from '@/lib/realtime';
import {
  consumePatientPaygCredit,
  getPatientConsultationAccess,
} from '@/lib/patientConsultationAccess';
import { isProviderApproved } from '@/lib/providerApproval';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'patient') {
      return NextResponse.json(
        { error: 'Unauthorized - Patient access only' },
        { status: 401 }
      );
    }

    await dbConnect();

    const patientEmail = session.user.email;

    // Find appointments for this patient by email with telemedicine session populated
    const appointments = await Appointment.find({ 
      patientEmail: patientEmail 
    })
      .populate({
        path: 'telemedicineSessionId',
        select: 'sessionNumber status consultationType scheduledStartTime scheduledEndTime roomId roomUrl'
      })
      .sort({ appointmentDate: -1 })
      .lean();

    // Also find telemedicine sessions directly linked to this patient (by email lookup)
    // This catches sessions that might not be linked via appointmentId
    const telemedicineSessions = await TelemedicineSession.find({
      status: { $in: ['scheduled', 'waiting', 'in-progress'] }
    })
      .populate('patientId', 'email name')
      .populate('doctorId', 'name email')
      .lean();

    // Filter sessions for this patient
    const patientSessions = telemedicineSessions.filter((ts: any) => 
      ts.patientId?.email === patientEmail
    );

    return NextResponse.json({ 
      appointments,
      telemedicineSessions: patientSessions,
      total: appointments.length 
    });
  } catch (error) {
    console.error('Error fetching patient appointments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email || session.user?.role !== 'patient') {
      return NextResponse.json(
        { error: 'Unauthorized - Patient access only' },
        { status: 401 }
      );
    }

    await dbConnect();

    const body = await request.json();
    const patient = await Patient.findOne({ email: session.user.email });
    if (!patient) {
      return NextResponse.json({ error: 'Patient record not found' }, { status: 404 });
    }

    const doctorId = String(body.doctorId || '').trim();
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return NextResponse.json({ error: 'Please select a doctor' }, { status: 400 });
    }

    const doctor = await User.findById(doctorId)
      .select('name email phone role specialization approvalStatus hasImage licenseNumber licenseCertificate')
      .lean();
    if (!doctor || (doctor as { role?: string }).role !== 'doctor') {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }
    if (!isProviderApproved(doctor as any)) {
      return NextResponse.json({ error: 'This doctor is not available for booking yet' }, { status: 403 });
    }

    const appointmentDate = String(body.appointmentDate || '').trim();
    const appointmentTime = normalizeTimeLabel(String(body.appointmentTime || ''));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
      return NextResponse.json({ error: 'Please select an appointment date' }, { status: 400 });
    }
    if (!appointmentTime) {
      return NextResponse.json({ error: 'Please select an appointment time' }, { status: 400 });
    }

    const selectedDay = new Date(`${appointmentDate}T00:00:00.000Z`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDay < today) {
      return NextResponse.json({ error: 'Appointment date cannot be in the past' }, { status: 400 });
    }

    const slotAvailable = await isSlotAvailableForDoctor(doctorId, appointmentDate, appointmentTime);
    if (!slotAvailable) {
      return NextResponse.json({ error: 'That time slot is no longer available' }, { status: 409 });
    }

    const access = await getPatientConsultationAccess({
      patientEmail: session.user.email,
      patientMongoId: String(patient._id),
    });
    if (!access.allowed) {
      return NextResponse.json(
        {
          error: access.message,
          access,
        },
        { status: 402 }
      );
    }

    const includeVideoCall = body.includeVideoCall === true || body.includeVideoCall === 'true';
    const reason = String(body.reason || '').trim().slice(0, 4000);
    if (reason.length < 2) {
      return NextResponse.json({ error: 'Please add a reason for the appointment' }, { status: 400 });
    }

    const d = doctor as {
      _id: mongoose.Types.ObjectId;
      name: string;
      email: string;
      phone?: string;
      specialization?: string;
    };
    const coverageLabel =
      access.source === 'subscription'
        ? `Subscription: ${access.activeSubscription?.planName || 'Active plan'}`
        : access.source === 'payg'
          ? `PAYG: ${access.paygTransaction?.reference || 'Paid'}`
          : 'Payment required';
    const notes = [String(body.notes || '').trim(), `Billing cover: ${coverageLabel}`]
      .filter(Boolean)
      .join('\n');

    const appointment = await Appointment.create({
      patientId: String(patient._id),
      patientName: patient.name,
      patientEmail: patient.email,
      patientPhone: patient.phone,
      doctorId: d._id,
      doctorName: d.name,
      doctorEmail: d.email,
      source: 'patient_portal',
      appointmentDate: normalizeAppointmentDateForStorage(appointmentDate),
      appointmentTime,
      appointmentType: includeVideoCall ? 'telemedicine' : 'consultation',
      status: 'scheduled',
      location: includeVideoCall ? 'Online consultation' : String(body.location || '').trim(),
      reason,
      notes,
    });

    try {
      await scheduleAppointmentReminder(appointment._id.toString());
    } catch (notificationError) {
      console.error('Failed to schedule patient appointment reminder:', notificationError);
    }

    let telemedicineSession = null;
    if (includeVideoCall) {
      const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
      const sessionDuration = Math.min(90, Math.max(15, Number(body.sessionDuration) || 30));
      const scheduledEndTime = new Date(appointmentDateTime.getTime() + sessionDuration * 60 * 1000);
      const systemCurrency = await getSystemCurrency();
      const dateStr = appointmentDateTime.toISOString().slice(0, 10).replace(/-/g, '');
      const todayCount = await TelemedicineSession.countDocuments({
        createdAt: {
          $gte: new Date(appointmentDateTime.getFullYear(), appointmentDateTime.getMonth(), appointmentDateTime.getDate()),
          $lt: new Date(appointmentDateTime.getFullYear(), appointmentDateTime.getMonth(), appointmentDateTime.getDate() + 1),
        },
      });
      const sessionNumber = `TM-${dateStr}-${String(todayCount + 1).padStart(4, '0')}-${Date.now().toString(36)}`;
      const roomId = `room-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      telemedicineSession = await TelemedicineSession.create({
        sessionNumber,
        roomId,
        appointmentId: appointment._id,
        patientId: patient._id,
        doctorId: d._id,
        consultationType: ['video', 'audio', 'chat'].includes(String(body.consultationType))
          ? body.consultationType
          : 'video',
        scheduledStartTime: appointmentDateTime,
        scheduledEndTime,
        status: 'scheduled',
        chiefComplaint: reason,
        consultationFee: access.source === 'payg' ? access.paygTransaction?.amount || 0 : 0,
        currency: access.source === 'payg' ? access.paygTransaction?.currency || systemCurrency : systemCurrency,
        paymentStatus: access.source === 'payg' ? 'paid' : 'waived',
        recordingEnabled: false,
        participants: [
          { odId: patient._id, odType: 'patient', name: patient.name, connectionStatus: 'waiting' },
          { odId: d._id, odType: 'doctor', name: d.name, connectionStatus: 'waiting' },
        ],
        chatMessages: [],
        createdBy: patient._id,
      });

      await Appointment.findByIdAndUpdate(appointment._id, {
        telemedicineSessionId: telemedicineSession._id,
      });
    }

    if (access.source === 'payg' && access.paygTransaction) {
      await consumePatientPaygCredit({
        transactionId: access.paygTransaction._id,
        appointmentId: String(appointment._id),
        telemedicineSessionId: telemedicineSession ? String(telemedicineSession._id) : undefined,
      });
    }

    if (includeVideoCall) {
      await emitRealtimeEvent({
        type: 'telemedicine.session.created',
        targets: [
          'role:admin',
          'role:staff',
          `user:${String(d._id)}`,
          `patient:${String(patient._id)}`,
          patient.patientId ? `patient:${patient.patientId}` : '',
        ].filter(Boolean),
        payload: {
          appointmentId: String(appointment._id),
          sessionId: telemedicineSession ? String(telemedicineSession._id) : undefined,
          patientName: patient.name,
          doctorName: d.name,
          scheduledStartTime: `${appointmentDate}T${appointmentTime}`,
        },
      });
    }

    await Promise.all([
      createNotification({
        type: includeVideoCall ? 'telemedicine' : 'appointment_reminder',
        recipientId: String(d._id),
        recipientType: 'user',
        recipientEmail: d.email,
        recipientPhone: d.phone,
        title: includeVideoCall ? 'New patient video consultation' : 'New patient appointment',
        message: `${patient.name} booked ${appointmentDate} at ${appointmentTime}.`,
        relatedEntity: {
          type: telemedicineSession ? 'telemedicineSession' : 'appointment',
          id: telemedicineSession ? String(telemedicineSession._id) : String(appointment._id),
        },
        metadata: {
          appointmentId: String(appointment._id),
          telemedicineSessionId: telemedicineSession ? String(telemedicineSession._id) : undefined,
          billingCover: access.source,
        },
      }),
      createNotification({
        type: includeVideoCall ? 'telemedicine' : 'appointment_reminder',
        recipientId: String(patient._id),
        recipientType: 'patient',
        recipientEmail: patient.email,
        recipientPhone: patient.phone,
        title: 'Appointment booked',
        message: `Your appointment with Dr. ${d.name} is scheduled for ${appointmentDate} at ${appointmentTime}.`,
        relatedEntity: { type: 'appointment', id: String(appointment._id) },
        metadata: {
          appointmentId: String(appointment._id),
          telemedicineSessionId: telemedicineSession ? String(telemedicineSession._id) : undefined,
          billingCover: access.source,
        },
      }),
    ]);

    const created = await Appointment.findById(appointment._id)
      .populate({
        path: 'telemedicineSessionId',
        select: 'sessionNumber status consultationType scheduledStartTime scheduledEndTime roomId roomUrl',
      })
      .lean();

    return NextResponse.json({ appointment: created, access }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating patient appointment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to book appointment' },
      { status: 500 }
    );
  }
}
