import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Appointment from '../../../../models/Appointment';
import {
  normalizeAppointmentDateForStorage,
  normalizeTimeLabel,
} from '@/lib/appointmentSlotting';
import TelemedicineSession from '../../../../models/TelemedicineSession';

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
