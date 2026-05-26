import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Appointment from '@/models/Appointment';
import Patient from '@/models/Patient';

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
  const series: Array<{ key: string; label: string; totalAppointments: number; completedAppointments: number; cancelledAppointments: number }> = [];

  if (bucketType === 'month') {
    let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endMonth = new Date(endDateExclusive.getFullYear(), endDateExclusive.getMonth(), 1);
    while (cursor <= endMonth) {
      const key = formatMonthKey(cursor);
      const label = cursor.toLocaleString(undefined, { month: 'short' });
      series.push({ key, label, totalAppointments: 0, completedAppointments: 0, cancelledAppointments: 0 });
      cursor = addMonths(cursor, 1);
    }
    return series;
  }

  if (bucketType === 'week') {
    let cursor = startOfDay(startDate);
    while (cursor < endDateExclusive) {
      const key = formatIsoWeekKey(cursor);
      if (!series.some(s => s.key === key)) {
        series.push({ key, label: key, totalAppointments: 0, completedAppointments: 0, cancelledAppointments: 0 });
      }
      cursor = addDays(cursor, 1);
    }
    return series;
  }

  let cursor = startOfDay(startDate);
  while (cursor < endDateExclusive) {
    const key = formatDayKey(cursor);
    const label = cursor.toLocaleString(undefined, { month: 'short', day: '2-digit' });
    series.push({ key, label, totalAppointments: 0, completedAppointments: 0, cancelledAppointments: 0 });
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

    // Fetch appointments
    const appointments = await Appointment.find({
      appointmentDate: { $gte: startDate, $lt: endDate }
    }).lean();

    // Calculate metrics
    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(a => a.status === 'completed').length;
    const appointmentUtilization = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;

    // Patient flow (unique patients per day)
    const patientsPerDay = totalAppointments / Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

    // Average wait time (simplified - would need actual wait time data)
    const averageWaitTime = 15; // Placeholder - would need actual wait time tracking

    // Resource utilization (based on appointment completion)
    const resourceUtilization = appointmentUtilization;

    // Status breakdown
    const appointmentStatusBreakdown: Record<string, number> = {};
    appointments.forEach(a => {
      const status = (a as any).status || 'unknown';
      appointmentStatusBreakdown[status] = (appointmentStatusBreakdown[status] || 0) + 1;
    });

    // Trend buckets
    const bucketType = getBucketType(dateRange);
    const buckets = buildBuckets(startDate, endDate, bucketType);
    const bucketIndex = new Map(buckets.map((b, i) => [b.key, i]));
    appointments.forEach((a: any) => {
      const d = a.appointmentDate ? new Date(a.appointmentDate) : null;
      if (!d) return;
      const key =
        bucketType === 'month' ? formatMonthKey(d) :
        bucketType === 'week' ? formatIsoWeekKey(d) :
        formatDayKey(d);
      const idx = bucketIndex.get(key);
      if (idx === undefined) return;
      buckets[idx].totalAppointments += 1;
      if (a.status === 'completed') buckets[idx].completedAppointments += 1;
      if (a.status === 'cancelled') buckets[idx].cancelledAppointments += 1;
    });

    const recentAppointments = await Appointment.find({
      appointmentDate: { $gte: startDate, $lt: endDate }
    })
      .select('patientName doctorName status appointmentDate appointmentTime appointmentType')
      .sort({ appointmentDate: -1 })
      .limit(10)
      .lean();

    const totalPatientsCreated = await Patient.countDocuments({
      createdAt: { $gte: startDate, $lt: endDate }
    });

    return NextResponse.json({
      appointmentUtilization,
      patientsPerDay,
      averageWaitTime,
      resourceUtilization,
      totalAppointments,
      completedAppointments,
      appointmentStatusBreakdown,
      appointmentsTrend: buckets.map(b => ({
        label: b.label,
        totalAppointments: b.totalAppointments,
        completedAppointments: b.completedAppointments,
        cancelledAppointments: b.cancelledAppointments,
      })),
      recentAppointments,
      totalPatientsCreated,
    });
  } catch (error: any) {
    console.error('Error fetching operational analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch operational analytics' },
      { status: 500 }
    );
  }
}
