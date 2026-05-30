import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { getMergedWebsiteContent } from '@/lib/getWebsiteContent';
import User from '@/models/User';
import Appointment from '@/models/Appointment';
import {
  normalizeTimeLabel,
  isSlotAvailableForDoctor,
  getEffectiveDoctorSchedule,
  loadBookedTimesForDoctorDay,
} from '@/lib/appointmentSlotting';
import { scheduleAppointmentReminder } from '@/lib/notifications/notification-service';
import Patient from '@/models/Patient';
import { getDefaultPhoneCountry } from '@/lib/phoneDefaultCountry';
import { phoneDigitsForMatch } from '@/lib/phoneNormalize';
import { verifyBookingVerificationToken } from '@/lib/publicBookingToken';
import { registerPatientFromBooking } from '@/lib/registerPatientFromBooking';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PORTAL_GENDERS = new Set(['male', 'female', 'other', 'prefer-not-to-say']);

/**
 * Public appointment booking: creates a real appointment with source=website
 * for a chosen doctor and an available slot.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const honeypot = String((body as Record<string, unknown>).website ?? '');
    if (honeypot.trim() !== '') {
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    await dbConnect();
    const content = await getMergedWebsiteContent();
    if (!content.appointmentRequestEnabled) {
      return NextResponse.json({ error: 'Appointment requests are disabled' }, { status: 403 });
    }

    let patientName = String((body as Record<string, unknown>).patientName ?? '').trim();
    let patientEmail = String((body as Record<string, unknown>).patientEmail ?? '').trim().toLowerCase();
    let patientPhone = String((body as Record<string, unknown>).patientPhone ?? '').trim();
    const patientTypeRaw = String((body as Record<string, unknown>).patientType ?? 'new').toLowerCase();
    const isReturningPatient = patientTypeRaw === 'existing';
    const bookingVerificationToken = String(
      (body as Record<string, unknown>).bookingVerificationToken ?? ''
    ).trim();
    let linkedPatientId: string | undefined;
    const doctorId = String((body as Record<string, unknown>).doctorId ?? '').trim();
    const preferredDate = String((body as Record<string, unknown>).preferredDate ?? '').trim();
    const preferredTimeRaw = String((body as Record<string, unknown>).preferredTime ?? '').trim();
    const preferredTime = normalizeTimeLabel(preferredTimeRaw);
    const reason = String((body as Record<string, unknown>).reason ?? '').trim().slice(0, 4000);
    const department = String((body as Record<string, unknown>).department ?? '').trim().slice(0, 500);

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return NextResponse.json({ error: 'Please select a doctor' }, { status: 400 });
    }
    if (isReturningPatient) {
      const verified = verifyBookingVerificationToken(bookingVerificationToken);
      if (!verified) {
        return NextResponse.json({ error: 'Please verify your phone with the code we sent you.' }, { status: 401 });
      }
      const patient = await Patient.findById(verified.patientId).select('name email phone').lean();
      if (!patient) {
        return NextResponse.json({ error: 'Patient record not found' }, { status: 400 });
      }
      const defaultCountry = await getDefaultPhoneCountry();
      const keyFromPatient = phoneDigitsForMatch(patient.phone || '', defaultCountry);
      const keyFromBody = phoneDigitsForMatch(patientPhone, defaultCountry);
      if (keyFromPatient !== verified.phoneKey || keyFromBody !== verified.phoneKey) {
        return NextResponse.json({ error: 'Phone does not match verification' }, { status: 400 });
      }
      patientName = String(patient.name || '').trim();
      patientEmail = String(patient.email || '').trim().toLowerCase();
      patientPhone = String(patient.phone || '').trim();
      linkedPatientId = String(patient._id);
      if (patientName.length < 2 || !EMAIL_RE.test(patientEmail)) {
        return NextResponse.json({ error: 'Invalid patient record' }, { status: 400 });
      }
    } else if (!isReturningPatient) {
      if (patientName.length < 2 || patientName.length > 200) {
        return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
      }
      if (!EMAIL_RE.test(patientEmail) || patientEmail.length > 320) {
        return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
      }
      if (patientPhone.length < 5 || patientPhone.length > 40) {
        return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });
      }
      const portalPassword = String((body as Record<string, unknown>).portalPassword ?? '').trim();
      if (portalPassword) {
        const dob = String((body as Record<string, unknown>).patientDateOfBirth ?? '').trim();
        const gender = String((body as Record<string, unknown>).patientGender ?? '').trim().toLowerCase();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
          return NextResponse.json(
            { error: 'Date of birth is required to create a portal account' },
            { status: 400 }
          );
        }
        if (!PORTAL_GENDERS.has(gender)) {
          return NextResponse.json({ error: 'Please select gender for portal registration' }, { status: 400 });
        }
        if (portalPassword.length < 8) {
          return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
        }
      }
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }
    if (!preferredTime) {
      return NextResponse.json({ error: 'Please select a time slot' }, { status: 400 });
    }

    const doctor = await User.findById(doctorId).select('name email role approvalStatus').lean();
    if (!doctor || (doctor as { role?: string }).role !== 'doctor') {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }
    if (
      (doctor as { approvalStatus?: string }).approvalStatus &&
      (doctor as { approvalStatus?: string }).approvalStatus !== 'approved'
    ) {
      return NextResponse.json({ error: 'This provider is not available for booking' }, { status: 403 });
    }

    const sched = await getEffectiveDoctorSchedule(doctorId);
    if (!sched.websiteBookingEnabled) {
      return NextResponse.json({ error: 'This provider is not accepting online bookings' }, { status: 403 });
    }

    const available = await isSlotAvailableForDoctor(doctorId, preferredDate, preferredTime);
    if (!available) {
      return NextResponse.json({ error: 'That time slot is no longer available' }, { status: 409 });
    }

    const appointmentDate = new Date(`${preferredDate}T00:00:00.000Z`);
    const d = doctor as { name: string; email: string };
    const doctorOid = new mongoose.Types.ObjectId(doctorId);

    const bookedFinal = await loadBookedTimesForDoctorDay(doctorId, d.email, d.name, preferredDate);
    if (bookedFinal.has(preferredTime)) {
      return NextResponse.json({ error: 'That time slot is no longer available' }, { status: 409 });
    }

    const notesLines = [
      department ? `Department / area: ${department}` : '',
      reason ? `Patient notes: ${reason}` : '',
    ].filter(Boolean);
    const notes = notesLines.length ? notesLines.join('\n') : '';

    let finalPatientId = linkedPatientId;
    let portalAccountCreated = false;
    if (!isReturningPatient) {
      const portalPassword = String((body as Record<string, unknown>).portalPassword ?? '').trim();
      if (portalPassword) {
        const dob = String((body as Record<string, unknown>).patientDateOfBirth ?? '').trim();
        const gender = String((body as Record<string, unknown>).patientGender ?? '').trim().toLowerCase();
        const reg = await registerPatientFromBooking({
          name: patientName,
          email: patientEmail,
          phone: patientPhone,
          dateOfBirth: dob,
          gender,
          password: portalPassword,
        });
        if (!reg.ok) {
          return NextResponse.json({ error: reg.error }, { status: reg.status });
        }
        finalPatientId = reg.patientId;
        portalAccountCreated = true;
      }
    }

    const doc = {
      ...(finalPatientId ? { patientId: finalPatientId } : {}),
      patientName,
      patientEmail,
      patientPhone,
      doctorId: doctorOid,
      doctorName: d.name,
      doctorEmail: d.email,
      source: 'website' as const,
      appointmentDate,
      appointmentTime: preferredTime,
      appointmentType: 'consultation' as const,
      status: 'scheduled' as const,
      location: '',
      reason: reason || undefined,
      notes,
    };

    const db = mongoose.connection.db;
    const collection = db?.collection('appointments');

    if (collection) {
      const result = await collection.insertOne({
        ...doc,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const idStr = result.insertedId.toString();
      try {
        await scheduleAppointmentReminder(idStr);
      } catch (e) {
        console.error('scheduleAppointmentReminder (public)', e);
      }
      return NextResponse.json(
        { ok: true, id: idStr, portalAccountCreated },
        { status: 201 }
      );
    }

    const appointment = new Appointment(doc);
    await appointment.save();
    const idStr = appointment._id.toString();
    try {
      await scheduleAppointmentReminder(idStr);
    } catch (e) {
      console.error('scheduleAppointmentReminder (public)', e);
    }
    return NextResponse.json(
      { ok: true, id: idStr, portalAccountCreated },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/public/appointment-request', error);
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
  }
}
