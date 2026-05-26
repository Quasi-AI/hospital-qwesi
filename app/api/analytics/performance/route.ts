import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Appointment from '@/models/Appointment';
import Report from '@/models/Report';

type BucketType = 'day' | 'week' | 'month';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function formatDayKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatMonthKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function formatIsoWeekKey(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${pad2(weekNo)}`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(d: Date, months: number) {
  return new Date(d.getFullYear(), d.getMonth() + months, 1);
}

function getBucketType(dateRange: string): BucketType {
  switch (dateRange) {
    case 'year':
      return 'month';
    case 'quarter':
      return 'week';
    default:
      return 'day';
  }
}

function buildBuckets(startDate: Date, endDateExclusive: Date, bucketType: BucketType) {
  const series: Array<{ key: string; label: string; appointments: number; reports: number }> = [];

  if (bucketType === 'month') {
    let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endMonth = new Date(endDateExclusive.getFullYear(), endDateExclusive.getMonth(), 1);
    while (cursor <= endMonth) {
      const key = formatMonthKey(cursor);
      const label = cursor.toLocaleString(undefined, { month: 'short' });
      series.push({ key, label, appointments: 0, reports: 0 });
      cursor = addMonths(cursor, 1);
    }
    return series;
  }

  if (bucketType === 'week') {
    let cursor = startOfDay(startDate);
    while (cursor < endDateExclusive) {
      const key = formatIsoWeekKey(cursor);
      if (!series.some(s => s.key === key)) {
        series.push({ key, label: key, appointments: 0, reports: 0 });
      }
      cursor = addDays(cursor, 1);
    }
    return series;
  }

  let cursor = startOfDay(startDate);
  while (cursor < endDateExclusive) {
    const key = formatDayKey(cursor);
    const label = cursor.toLocaleString(undefined, { month: 'short', day: '2-digit' });
    series.push({ key, label, appointments: 0, reports: 0 });
    cursor = addDays(cursor, 1);
  }
  return series;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || 'month';

    // Calculate date range
    const today = new Date();
    let startDate: Date;
    let endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    switch (dateRange) {
      case 'today':
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    // Fetch doctors
    const doctors = await User.find({ role: 'doctor' }).lean();

    // Fetch appointments and reports for each doctor
    const doctorPerformance = await Promise.all(
      doctors.map(async (doctor) => {
        const appointments = await Appointment.countDocuments({
          doctorEmail: doctor.email,
          appointmentDate: { $gte: startDate, $lt: endDate }
        });

        const reports = await Report.countDocuments({
          doctorId: doctor._id.toString(),
          reportDate: { $gte: startDate, $lt: endDate }
        });

        return {
          doctorId: doctor._id.toString(),
          doctorName: doctor.name,
          appointments,
          reports,
          efficiency: appointments + reports, // Simplified efficiency metric
        };
      })
    );

    // Calculate overall metrics
    const totalDoctors = doctors.length;
    const totalAppointments = doctorPerformance.reduce((sum, d) => sum + d.appointments, 0);
    const totalReports = doctorPerformance.reduce((sum, d) => sum + d.reports, 0);
    const averageAppointments = totalDoctors > 0 ? totalAppointments / totalDoctors : 0;
    const averageReports = totalDoctors > 0 ? totalReports / totalDoctors : 0;

    // Sort by performance
    doctorPerformance.sort((a, b) => b.efficiency - a.efficiency);

    // Activity trend (overall)
    const bucketType = getBucketType(dateRange);
    const buckets = buildBuckets(startDate, endDate, bucketType);
    const bucketIndex = new Map(buckets.map((b, i) => [b.key, i]));

    const appointmentDates = await Appointment.find({
      appointmentDate: { $gte: startDate, $lt: endDate }
    }).select('appointmentDate').lean();

    appointmentDates.forEach((a: any) => {
      const d = a.appointmentDate ? new Date(a.appointmentDate) : null;
      if (!d) return;
      const key =
        bucketType === 'month' ? formatMonthKey(d) :
        bucketType === 'week' ? formatIsoWeekKey(d) :
        formatDayKey(d);
      const idx = bucketIndex.get(key);
      if (idx === undefined) return;
      buckets[idx].appointments += 1;
    });

    const reportDates = await Report.find({
      reportDate: { $gte: startDate, $lt: endDate }
    }).select('reportDate').lean();

    reportDates.forEach((r: any) => {
      const d = r.reportDate ? new Date(r.reportDate) : null;
      if (!d) return;
      const key =
        bucketType === 'month' ? formatMonthKey(d) :
        bucketType === 'week' ? formatIsoWeekKey(d) :
        formatDayKey(d);
      const idx = bucketIndex.get(key);
      if (idx === undefined) return;
      buckets[idx].reports += 1;
    });

    return NextResponse.json({
      totalDoctors,
      totalAppointments,
      totalReports,
      averageAppointments,
      averageReports,
      doctorPerformance: doctorPerformance.slice(0, 10), // Top 10
      activityTrend: buckets.map(b => ({
        label: b.label,
        appointments: b.appointments,
        reports: b.reports,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching performance analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch performance analytics' },
      { status: 500 }
    );
  }
}
