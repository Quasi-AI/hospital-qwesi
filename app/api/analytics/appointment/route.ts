import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Appointment from '@/models/Appointment';

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
  const series: Array<{ key: string; label: string; total: number; completed: number; cancelled: number }> = [];

  if (bucketType === 'month') {
    let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endMonth = new Date(endDateExclusive.getFullYear(), endDateExclusive.getMonth(), 1);
    while (cursor <= endMonth) {
      const key = formatMonthKey(cursor);
      const label = cursor.toLocaleString(undefined, { month: 'short' });
      series.push({ key, label, total: 0, completed: 0, cancelled: 0 });
      cursor = addMonths(cursor, 1);
    }
    return series;
  }

  if (bucketType === 'week') {
    let cursor = startOfDay(startDate);
    while (cursor < endDateExclusive) {
      const key = formatIsoWeekKey(cursor);
      if (!series.some(s => s.key === key)) {
        series.push({ key, label: key, total: 0, completed: 0, cancelled: 0 });
      }
      cursor = addDays(cursor, 1);
    }
    return series;
  }

  let cursor = startOfDay(startDate);
  while (cursor < endDateExclusive) {
    const key = formatDayKey(cursor);
    const label = cursor.toLocaleString(undefined, { month: 'short', day: '2-digit' });
    series.push({ key, label, total: 0, completed: 0, cancelled: 0 });
    cursor = addDays(cursor, 1);
  }
  return series;
}

const ESTIMATED_DURATIONS: Record<string, number> = {
  consultation: 30,
  'follow-up': 20,
  followUp: 20,
  checkup: 20,
  emergency: 60,
  surgery: 120,
  therapy: 45,
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || 'month';

    const today = new Date();
    let startDate: Date;
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

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
      case 'quarter': {
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        break;
      }
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    const appointments = await Appointment.find({
      appointmentDate: { $gte: startDate, $lt: endDate }
    })
      .select('appointmentDate appointmentTime status appointmentType patientName doctorName')
      .sort({ appointmentDate: -1 })
      .lean();

    const totalAppointments = appointments.length;
    const completed = appointments.filter((a: any) => a.status === 'completed').length;
    const cancelled = appointments.filter((a: any) => a.status === 'cancelled').length;
    const completionRate = totalAppointments > 0 ? (completed / totalAppointments) * 100 : 0;
    const noShowRate = totalAppointments > 0 ? (cancelled / totalAppointments) * 100 : 0;

    // Estimated duration (based on type mapping)
    const totalEstimatedMinutes = appointments.reduce((sum: number, a: any) => {
      const t = (a.appointmentType || '').toString();
      return sum + (ESTIMATED_DURATIONS[t] ?? 30);
    }, 0);
    const averageDuration = totalAppointments > 0 ? totalEstimatedMinutes / totalAppointments : 0;

    // Type distribution
    const typeDistribution: Record<string, number> = {};
    appointments.forEach((a: any) => {
      const t = (a.appointmentType || 'unknown').toString();
      typeDistribution[t] = (typeDistribution[t] || 0) + 1;
    });

    // Status breakdown
    const statusBreakdown: Record<string, number> = {};
    appointments.forEach((a: any) => {
      const s = (a.status || 'unknown').toString();
      statusBreakdown[s] = (statusBreakdown[s] || 0) + 1;
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
      buckets[idx].total += 1;
      if (a.status === 'completed') buckets[idx].completed += 1;
      if (a.status === 'cancelled') buckets[idx].cancelled += 1;
    });

    const recentAppointments = appointments.slice(0, 10).map((a: any) => ({
      _id: a._id,
      patientName: a.patientName,
      doctorName: a.doctorName,
      appointmentType: a.appointmentType,
      status: a.status,
      appointmentDate: a.appointmentDate,
      appointmentTime: a.appointmentTime,
    }));

    return NextResponse.json({
      totalAppointments,
      completed,
      cancelled,
      completionRate,
      noShowRate,
      averageDuration,
      typeDistribution,
      statusBreakdown,
      appointmentTrend: buckets.map(b => ({
        label: b.label,
        total: b.total,
        completed: b.completed,
        cancelled: b.cancelled,
        noShowRate: b.total > 0 ? (b.cancelled / b.total) * 100 : 0,
      })),
      recentAppointments,
    });
  } catch (error: any) {
    console.error('Error fetching appointment analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch appointment analytics' },
      { status: 500 }
    );
  }
}

