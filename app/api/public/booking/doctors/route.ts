import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getEffectiveDoctorSchedule } from '@/lib/appointmentSlotting';

/** Public marketplace directory: approved doctors and herbalists who enable online bookings. */
export async function GET() {
  try {
    await dbConnect();
    const providers = await User.find({
      role: { $in: ['doctor', 'herbalist'] },
      approvalStatus: 'approved',
      hasImage: true,
      licenseNumber: { $exists: true, $ne: '' },
      'licenseCertificate.data': { $exists: true, $ne: '' },
    })
      .select('_id name specialization department role consultationFee consultationCurrency rating yearsOfExperience')
      .sort({ name: 1 })
      .lean();

    const list = [];
    for (const provider of providers as any[]) {
      const id = provider._id.toString();
      const schedule = await getEffectiveDoctorSchedule(id);
      if (!schedule.websiteBookingEnabled) continue;
      list.push({
        id,
        name: provider.name,
        specialization: provider.specialization || '',
        department: provider.department || '',
        providerType: provider.role,
        consultationFee: Number(provider.consultationFee || 0),
        currency: provider.consultationCurrency || 'GHS',
        rating: provider.rating,
        yearsOfExperience: provider.yearsOfExperience,
        slotDurationMinutes: schedule.slotDurationMinutes,
      });
    }
    return NextResponse.json(list);
  } catch (error) {
    console.error('GET /api/public/booking/doctors', error);
    return NextResponse.json({ error: 'Failed to load providers' }, { status: 500 });
  }
}
