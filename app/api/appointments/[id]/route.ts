import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Appointment from '../../../../models/Appointment';
import {
  normalizeAppointmentDateForStorage,
  normalizeTimeLabel,
} from '@/lib/appointmentSlotting';
import TelemedicineSession from '../../../../models/TelemedicineSession';
import { zonedToInstant, safeTimeZone, ymdOf } from '@/lib/timezone';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    
    // Use native MongoDB to read the raw document (bypasses Mongoose schema filtering)
    const mongoose = await import('mongoose');
    const db = mongoose.default.connection.db;
    const collection = db?.collection('appointments');
    
    let appointment: Record<string, unknown> | null = null;
    
    if (collection && mongoose.default.Types.ObjectId.isValid(id)) {
      appointment = await collection.findOne({ _id: new mongoose.default.Types.ObjectId(id) }) as Record<string, unknown> | null;
    }
    
    // Fallback to Mongoose if native didn't work
    if (!appointment) {
      const doc = await Appointment.findById(id).lean();
      appointment = doc as Record<string, unknown> | null;
    }
    
    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Ensure _id is string and location is always present
    const response = {
      ...appointment,
      _id: (appointment._id as any)?.toString?.() ?? appointment._id,
      location: (appointment.location as string) ?? '',
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointment' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    
    // Build update with all fields explicitly including location
    const mongoose = await import('mongoose');
    let doctorOid: InstanceType<typeof mongoose.default.Types.ObjectId> | undefined | null =
      undefined;
    if (body.doctorId !== undefined) {
      if (body.doctorId && mongoose.default.Types.ObjectId.isValid(String(body.doctorId))) {
        doctorOid = new mongoose.default.Types.ObjectId(String(body.doctorId));
      } else {
        doctorOid = null;
      }
    }
    let sourceUpdate: string | undefined;
    if (body.source !== undefined) {
      const s = String(body.source);
      sourceUpdate = ['staff', 'website', 'patient_portal'].includes(s) ? s : 'staff';
    }

    const update: Record<string, unknown> = {
      patientId: body.patientId,
      patientName: body.patientName,
      patientEmail: body.patientEmail,
      patientPhone: body.patientPhone,
      doctorName: body.doctorName,
      doctorEmail: body.doctorEmail,
      appointmentDate:
        body.appointmentDate !== undefined
          ? normalizeAppointmentDateForStorage(body.appointmentDate)
          : body.appointmentDate,
      appointmentTime:
        body.appointmentTime !== undefined
          ? normalizeTimeLabel(String(body.appointmentTime)) || String(body.appointmentTime).trim()
          : body.appointmentTime,
      appointmentType: body.appointmentType,
      status: body.status,
      location: body.location || '',
      reason: body.reason,
      notes: body.notes,
      symptoms: body.symptoms,
      diagnosis: body.diagnosis,
      treatment: body.treatment,
      updatedAt: new Date(),
    };
    if (doctorOid !== undefined) {
      update.doctorId = doctorOid;
    }
    if (sourceUpdate !== undefined) {
      update.source = sourceUpdate;
    }

    // Never write undefined fields (a partial update such as a reschedule must not blank the rest)
    for (const k of Object.keys(update)) if (update[k] === undefined) delete update[k];

    // Rescheduling: validate the new moment in the DOCTOR'S time zone, keep startAt and the call session in step
    let rescheduledTo: Date | null = null;
    if (update.appointmentDate !== undefined || update.appointmentTime !== undefined) {
      const current: any = await Appointment.findById(id).select('appointmentDate appointmentTime doctorTimeZone doctorId doctorEmail status').lean();
      if (!current) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
      const date = (update.appointmentDate as Date | undefined) ?? current.appointmentDate;
      const time = (update.appointmentTime as string | undefined) ?? current.appointmentTime;
      if (Number.isNaN(new Date(date).getTime()) || !/^\d{1,2}:\d{2}/.test(String(time))) {
        return NextResponse.json({ error: 'Please choose a valid date and time' }, { status: 400 });
      }
      const tz = safeTimeZone(current.doctorTimeZone);
      const at = zonedToInstant(ymdOf(date), String(time), tz);
      const changed = ymdOf(date) !== ymdOf(current.appointmentDate) || String(time) !== String(current.appointmentTime);
      if (changed) {
        if (at.getTime() < Date.now() - 60_000) {
          return NextResponse.json({ error: 'That time has already passed. Please pick a future time.' }, { status: 400 });
        }
        const clash = await Appointment.findOne({
          _id: { $ne: id },
          status: { $nin: ['cancelled'] },
          appointmentDate: date,
          appointmentTime: time,
          ...(current.doctorId ? { doctorId: current.doctorId } : { doctorEmail: current.doctorEmail }),
        }).select('_id').lean();
        if (clash) return NextResponse.json({ error: 'The doctor already has an appointment at that time. Please choose another slot.' }, { status: 409 });
        update.startAt = at;
        update.doctorTimeZone = tz;
        // a rescheduled visit is upcoming again, even if it had been marked missed or completed
        if (!update.status && ['completed', 'cancelled'].includes(String(current.status))) update.status = 'scheduled';
        rescheduledTo = at;
      }
    }

    // Use native MongoDB update to bypass any Mongoose schema caching
    const db = mongoose.default.connection.db;
    const collection = db?.collection('appointments');
    
    if (collection) {
      const result = await collection.findOneAndUpdate(
        { _id: new mongoose.default.Types.ObjectId(id) },
        { $set: update },
        { returnDocument: 'after' }
      );
      
      if (!result) {
        return NextResponse.json(
          { error: 'Appointment not found' },
          { status: 404 }
        );
      }
      
      if (rescheduledTo) {
        try {
          const sess: any = await TelemedicineSession.findOne({ appointmentId: result._id }).select('scheduledStartTime scheduledEndTime status').lean();
          if (sess && !['completed', 'in-progress'].includes(sess.status)) {
            const len = Math.max(15 * 60_000, new Date(sess.scheduledEndTime).getTime() - new Date(sess.scheduledStartTime).getTime() || 30 * 60_000);
            await TelemedicineSession.updateOne({ _id: sess._id }, { $set: { scheduledStartTime: rescheduledTo, scheduledEndTime: new Date(rescheduledTo.getTime() + len), status: 'scheduled' } });
          }
        } catch (e) { console.error('Could not move the call session', e); }
      }

      const response = {
        ...result,
        _id: result._id?.toString?.() ?? result._id,
        location: result.location ?? '',
      };
      
      return NextResponse.json(response);
    }
    
    // Fallback to Mongoose
    const fallbackAppointment = await Appointment.findByIdAndUpdate(
      id,
      update,
      { returnDocument: 'after', runValidators: true }
    ).lean();

    if (!fallbackAppointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    const response = {
      ...fallbackAppointment,
      _id: (fallbackAppointment as any)._id?.toString?.() ?? (fallbackAppointment as any)._id,
      location: (fallbackAppointment as any).location ?? '',
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const appointment = await Appointment.findById(id).lean();
    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    const telemedicineSessionId = (appointment as any).telemedicineSessionId;
    if (telemedicineSessionId) {
      await TelemedicineSession.findByIdAndDelete(telemedicineSessionId);
    }

    await Appointment.findByIdAndDelete(id);

    return NextResponse.json({
      message: 'Appointment deleted successfully',
      telemedicineDeleted: !!telemedicineSessionId,
    });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return NextResponse.json(
      { error: 'Failed to delete appointment' },
      { status: 500 }
    );
  }
}
