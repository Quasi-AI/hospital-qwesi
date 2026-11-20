import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';
import { authOptions } from '../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Appointment from '@/models/Appointment';
import TelemedicineSession from '@/models/TelemedicineSession';
import { createNotification, scheduleAppointmentReminder } from '@/lib/notifications/notification-service';
import { getSystemCurrency } from '@/lib/getSystemCurrency';
import { emitRealtimeEvent } from '@/lib/realtime';
import {
  normalizeAppointmentDateForStorage,
  normalizeTimeLabel,
} from '@/lib/appointmentSlotting';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const doctorIdParam = searchParams.get('doctorId');

    // Build query based on user role
    let query: Record<string, unknown> = {};

    if (session?.user) {
      if (session.user.role === 'doctor') {
        const or: Record<string, unknown>[] = [
          { doctorEmail: session.user.email },
          { doctorName: session.user.name },
        ];
        if (session.user.id && mongoose.Types.ObjectId.isValid(session.user.id)) {
          or.push({ doctorId: new mongoose.Types.ObjectId(session.user.id) });
        }
        query.$or = or;
      } else if (session.user.role === 'patient') {
        query.patientEmail = session.user.email;
      } else if (
        (session.user.role === 'admin' || session.user.role === 'staff') &&
        doctorIdParam &&
        mongoose.Types.ObjectId.isValid(doctorIdParam)
      ) {
        const oid = new mongoose.Types.ObjectId(doctorIdParam);
        const User = (await import('@/models/User')).default;
        const userDoc = await User.findById(oid).select('email name').lean();
        const or: Record<string, unknown>[] = [{ doctorId: oid }];
        if (userDoc && typeof userDoc === 'object') {
          const u = userDoc as { email?: string };
          if (u.email) {
            or.push({ doctorEmail: u.email });
          }
        }
        query.$or = or;
      }
      // admin and staff without doctorId: no filter → all appointments
    }

    const appointments = await Appointment.find(query).sort({ appointmentDate: -1 }).lean();

    const User = (await import('@/models/User')).default;
    const docIds = new Set<string>();
    const docEmails = new Set<string>();
    for (const a of appointments) {
      if (a.doctorId && mongoose.Types.ObjectId.isValid(String(a.doctorId))) {
        docIds.add(String(a.doctorId));
      }
      const em = (a as { doctorEmail?: string }).doctorEmail;
      if (em) docEmails.add(String(em).toLowerCase().trim());
    }

    const [byIdDocs, byEmailDocs] = await Promise.all([
      docIds.size
        ? User.find({
            _id: { $in: [...docIds].map((id) => new mongoose.Types.ObjectId(id)) },
          })
            .select('specialization')
            .lean()
        : Promise.resolve([]),
      docEmails.size
        ? User.find({ role: 'doctor', email: { $in: [...docEmails] } })
            .select('email specialization')
            .lean()
        : Promise.resolve([]),
    ]);

    const specById = new Map<string, string>();
    for (const d of byIdDocs as { _id: mongoose.Types.ObjectId; specialization?: string }[]) {
      specById.set(d._id.toString(), (d.specialization || '').trim());
    }
    const specByEmail = new Map<string, string>();
    for (const d of byEmailDocs as { email?: string; specialization?: string }[]) {
      if (d.email) {
        specByEmail.set(d.email.toLowerCase().trim(), (d.specialization || '').trim());
      }
    }

    const enriched = appointments.map((a) => {
      let spec = '';
      if (a.doctorId && mongoose.Types.ObjectId.isValid(String(a.doctorId))) {
        spec = specById.get(String(a.doctorId)) || '';
      }
      const em = (a as { doctorEmail?: string }).doctorEmail;
      if (!spec && em) {
        spec = specByEmail.get(String(em).toLowerCase().trim()) || '';
      }
      return {
        ...a,
        doctorSpecialization: spec || undefined,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    await dbConnect();
    const body = await request.json();
    
    // Ensure includeVideoCall is a boolean
    const includeVideoCall = body.includeVideoCall === true || body.includeVideoCall === 'true';
    
    // If logged in as a doctor, set doctor id/email/name for telemedicine and doc
    if (session?.user?.role === 'doctor') {
      body.doctorId = body.doctorId || session.user.id;
      body.doctorEmail = session.user.email;
      if (!body.doctorName && session.user.name) {
        body.doctorName = session.user.name;
      }
    } else if (body.doctorName && !body.doctorEmail) {
      // If admin/staff selected a doctor, find the doctor's email
      const User = (await import('@/models/User')).default;
      const doctor = await User.findOne({ 
        name: body.doctorName,
        role: 'doctor'
      });
      if (doctor) {
        body.doctorEmail = doctor.email;
      }
    }

    const mongooseMod = await import('mongoose');
    let doctorOid: InstanceType<typeof mongooseMod.default.Types.ObjectId> | undefined;
    if (body.doctorId && mongooseMod.default.Types.ObjectId.isValid(String(body.doctorId))) {
      doctorOid = new mongooseMod.default.Types.ObjectId(String(body.doctorId));
    }
    const sourceRaw = String(body.source || 'staff');
    const source = ['staff', 'website', 'patient_portal'].includes(sourceRaw) ? sourceRaw : 'staff';

    const appointmentDateNorm = normalizeAppointmentDateForStorage(body.appointmentDate);
    const timeRaw = String(body.appointmentTime ?? '');
    const appointmentTimeNorm = normalizeTimeLabel(timeRaw) || timeRaw.trim();

    // Build the document with all fields including location
    const doc = {
      patientId: body.patientId,
      patientName: body.patientName,
      patientEmail: body.patientEmail,
      patientPhone: body.patientPhone,
      doctorId: doctorOid,
      doctorName: body.doctorName,
      doctorEmail: body.doctorEmail,
      source,
      appointmentDate: appointmentDateNorm,
      appointmentTime: appointmentTimeNorm,
      appointmentType: body.appointmentType || 'consultation',
      status: body.status || 'scheduled',
      location: body.location || '',
      reason: body.reason,
      notes: body.notes,
      symptoms: body.symptoms,
      diagnosis: body.diagnosis,
      treatment: body.treatment,
    };

    // Use insertOne directly on the collection to bypass any Mongoose schema caching
    const db = (await import('mongoose')).default.connection.db;
    const collection = db?.collection('appointments');
    
    let appointment;
    let response;
    
    if (collection) {
      // Direct MongoDB insert to ensure location is saved
      const result = await collection.insertOne({
        ...doc,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      const inserted = await collection.findOne({ _id: result.insertedId });
      
      response = {
        ...inserted,
        _id: result.insertedId.toString(),
        location: inserted?.location ?? '',
      };
      
      // Still create a Mongoose doc for the reminder (but don't save again)
      appointment = new Appointment(doc);
      appointment._id = result.insertedId;
    } else {
      // Fallback to Mongoose if native not available
      appointment = new Appointment(doc);
      await appointment.save();

      const created = appointment.toObject ? appointment.toObject() : (appointment as any);
      response = {
        ...created,
        _id: created._id?.toString?.() ?? created._id,
        location: created.location ?? '',
      };
    }
    
    // Schedule appointment reminder notification
    try {
      await scheduleAppointmentReminder(appointment._id.toString());
    } catch (notificationError) {
      console.error('Failed to schedule appointment reminder:', notificationError);
    }

    // Create TelemedicineSession if video call is included
    if (includeVideoCall) {
      const Patient = (await import('@/models/Patient')).default;
      const User = (await import('@/models/User')).default;
      const mongoose = (await import('mongoose')).default;

      // Find patient by Mongo id, display patientId, email, or name
      let patient = null;
      if (body.patientId) {
        const pid = String(body.patientId).trim();
        if (mongoose.Types.ObjectId.isValid(pid)) {
          patient = await Patient.findById(pid);
        }
        if (!patient) {
          patient = await Patient.findOne({ patientId: pid });
        }
      }
      if (!patient && body.patientEmail) {
        const email = String(body.patientEmail).trim().toLowerCase();
        patient = await Patient.findOne({ email });
      }
      if (!patient && body.patientName) {
        patient = await Patient.findOne({ name: body.patientName.trim() });
      }

      // Find doctor: when session is doctor use session id first, then body.doctorId, then email/name
      let doctor = null;
      if (session?.user?.role === 'doctor' && session.user.id) {
        doctor = await User.findById(session.user.id);
      }
      if (!doctor && body.doctorId) {
        doctor = await User.findById(body.doctorId);
      }
      if (!doctor && body.doctorEmail) {
        const docEmail = String(body.doctorEmail).trim().toLowerCase();
        doctor = await User.findOne({ email: docEmail, role: 'doctor' });
      }
      if (!doctor && body.doctorName) {
        doctor = await User.findOne({ name: body.doctorName.trim(), role: 'doctor' });
      }

      if (!patient || !doctor) {
        console.error('Telemedicine skip: patient=', !!patient, 'doctor=', !!doctor, 'patientId=', body.patientId, 'doctorId=', body.doctorId);
        (response as any).telemedicineSkipped = true;
        (response as any).telemedicineReason = !patient
          ? 'Patient not found in system. Select patient from the list when using video consultation.'
          : 'Doctor not found.';
      } else {
        try {
          const systemCurrency = await getSystemCurrency();
          const appointmentDateTime = new Date(`${body.appointmentDate}T${body.appointmentTime}`);
          const sessionDuration = Number(body.sessionDuration) || 30;
          const scheduledEndTime = new Date(appointmentDateTime.getTime() + sessionDuration * 60 * 1000);

          let createdById = doctor._id;
          if (session?.user?.id) {
            try {
              createdById = new mongoose.Types.ObjectId(session.user.id);
            } catch {
              createdById = doctor._id;
            }
          }

          // Generate sessionNumber and roomId explicitly to avoid pre-hook timing issues
          const dateStr = appointmentDateTime.toISOString().slice(0, 10).replace(/-/g, '');
          const todayCount = await TelemedicineSession.countDocuments({
            createdAt: {
              $gte: new Date(appointmentDateTime.getFullYear(), appointmentDateTime.getMonth(), appointmentDateTime.getDate()),
              $lt: new Date(appointmentDateTime.getFullYear(), appointmentDateTime.getMonth(), appointmentDateTime.getDate() + 1),
            },
          });
          const sessionNumber = `TM-${dateStr}-${String(todayCount + 1).padStart(4, '0')}-${Date.now().toString(36)}`;
          const roomId = `room-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

          const telemedicineSession = new TelemedicineSession({
            sessionNumber,
            roomId,
            appointmentId: appointment._id,
            patientId: patient._id,
            doctorId: doctor._id,
            consultationType: body.consultationType || 'video',
            scheduledStartTime: appointmentDateTime,
            scheduledEndTime,
            status: 'scheduled',
            chiefComplaint: body.reason,
            consultationFee: 0,
            currency: systemCurrency,
            paymentStatus: 'pending',
            recordingEnabled: false,
            participants: [
              { odId: patient._id, odType: 'patient', name: patient.name, connectionStatus: 'waiting' as const },
              { odId: doctor._id, odType: 'doctor', name: doctor.name, connectionStatus: 'waiting' as const },
            ],
            chatMessages: [],
            createdBy: createdById,
          });

          await telemedicineSession.save();

          await emitRealtimeEvent({
            type: 'telemedicine.session.created',
            targets: [
              'role:admin',
              'role:staff',
              `user:${String(doctor._id)}`,
              `patient:${String(patient._id)}`,
              patient.patientId ? `patient:${patient.patientId}` : '',
            ].filter(Boolean),
            payload: {
              sessionId: String(telemedicineSession._id),
              sessionNumber: telemedicineSession.sessionNumber,
              status: telemedicineSession.status,
              patientName: patient.name,
              doctorName: doctor.name,
              scheduledStartTime: appointmentDateTime,
            },
          });

          await Promise.all([
            createNotification({
              type: 'telemedicine',
              recipientId: String(doctor._id),
              recipientType: 'user',
              recipientEmail: doctor.email,
              recipientPhone: doctor.phone,
              title: 'New telemedicine session scheduled',
              message: `${patient.name} is scheduled for ${appointmentDateTime.toLocaleString()}.`,
              relatedEntity: { type: 'telemedicineSession', id: String(telemedicineSession._id) },
              metadata: { sessionId: String(telemedicineSession._id), sessionNumber: telemedicineSession.sessionNumber },
            }),
            createNotification({
              type: 'telemedicine',
              recipientId: String(patient._id),
              recipientType: 'patient',
              recipientEmail: patient.email,
              recipientPhone: patient.phone,
              title: 'Telemedicine session scheduled',
              message: `Your session with Dr. ${doctor.name} is scheduled for ${appointmentDateTime.toLocaleString()}.`,
              relatedEntity: { type: 'telemedicineSession', id: String(telemedicineSession._id) },
              metadata: { sessionId: String(telemedicineSession._id), sessionNumber: telemedicineSession.sessionNumber },
            }),
          ]);

          if (collection) {
            await collection.updateOne(
              { _id: appointment._id },
              { $set: { telemedicineSessionId: telemedicineSession._id } }
            );
          } else {
            await Appointment.findByIdAndUpdate(appointment._id, {
              telemedicineSessionId: telemedicineSession._id,
            });
          }

          response.telemedicineSessionId = telemedicineSession._id.toString();
          response.telemedicineSession = {
            _id: telemedicineSession._id.toString(),
            sessionNumber: telemedicineSession.sessionNumber,
            consultationType: telemedicineSession.consultationType,
            roomId: telemedicineSession.roomId,
          };
        } catch (telemedicineError) {
          console.error('Failed to create telemedicine session:', telemedicineError);
          (response as any).telemedicineSkipped = true;
          (response as any).telemedicineReason =
            telemedicineError instanceof Error ? telemedicineError.message : 'Failed to create video session.';
        }
      }
    }
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    );
  }
}
