import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Report from '@/models/Report';
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

// ISO week key, e.g. 2026-W04
function formatIsoWeekKey(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7; // 1..7 (Mon..Sun)
  date.setUTCDate(date.getUTCDate() + 4 - dayNum); // nearest Thursday
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
  const series: Array<{ key: string; label: string; totalReports: number; completedReports: number }> = [];

  if (bucketType === 'month') {
    let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endMonth = new Date(endDateExclusive.getFullYear(), endDateExclusive.getMonth(), 1);
    while (cursor <= endMonth) {
      const key = formatMonthKey(cursor);
      const label = cursor.toLocaleString(undefined, { month: 'short' });
      series.push({ key, label, totalReports: 0, completedReports: 0 });
      cursor = addMonths(cursor, 1);
    }
    return series;
  }

  if (bucketType === 'week') {
    let cursor = startOfDay(startDate);
    while (cursor < endDateExclusive) {
      const key = formatIsoWeekKey(cursor);
      if (!series.some(s => s.key === key)) {
        series.push({ key, label: key, totalReports: 0, completedReports: 0 });
      }
      cursor = addDays(cursor, 1);
    }
    return series;
  }

  // day
  let cursor = startOfDay(startDate);
  while (cursor < endDateExclusive) {
    const key = formatDayKey(cursor);
    const label = cursor.toLocaleString(undefined, { month: 'short', day: '2-digit' });
    series.push({ key, label, totalReports: 0, completedReports: 0 });
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

    // Fetch reports
    const reports = await Report.find({
      reportDate: { $gte: startDate, $lt: endDate }
    }).lean();

    // Fetch appointments
    const appointments = await Appointment.find({
      appointmentDate: { $gte: startDate, $lt: endDate }
    }).lean();

    // Calculate metrics
    const totalReports = reports.length;
    const completedReports = reports.filter(r => r.status === 'completed').length;
    const patientOutcomes = completedReports; // Simplified
    const treatmentEffectiveness = totalReports > 0 ? (completedReports / totalReports) * 100 : 0;

    // Disease trends (from report types)
    const diseaseTrends: Record<string, number> = {};
    reports.forEach(r => {
      const type = r.reportType || 'other';
      diseaseTrends[type] = (diseaseTrends[type] || 0) + 1;
    });

    // Report status breakdown
    const reportStatusBreakdown: Record<string, number> = {};
    reports.forEach(r => {
      const status = r.status || 'unknown';
      reportStatusBreakdown[status] = (reportStatusBreakdown[status] || 0) + 1;
    });

    // Report trend series
    const bucketType = getBucketType(dateRange);
    const buckets = buildBuckets(startDate, endDate, bucketType);
    const bucketIndex = new Map(buckets.map((b, i) => [b.key, i]));
    reports.forEach((r: any) => {
      const d = r.reportDate ? new Date(r.reportDate) : null;
      if (!d) return;
      const key =
        bucketType === 'month' ? formatMonthKey(d) :
        bucketType === 'week' ? formatIsoWeekKey(d) :
        formatDayKey(d);
      const idx = bucketIndex.get(key);
      if (idx === undefined) return;
      buckets[idx].totalReports += 1;
      if (r.status === 'completed') buckets[idx].completedReports += 1;
    });

    // Active cases (patients with recent appointments)
    const activePatients = await Patient.countDocuments({
      createdAt: { $gte: startDate }
    });

    const recentReports = await Report.find({
      reportDate: { $gte: startDate, $lt: endDate }
    })
      .select('patientName doctorName reportType status reportDate')
      .sort({ reportDate: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      patientOutcomes,
      treatmentEffectiveness,
      diseaseTrends,
      reportStatusBreakdown,
      activeCases: activePatients,
      totalReports,
      completedReports,
      totalAppointments: appointments.length,
      completedAppointments: appointments.filter(a => a.status === 'completed').length,
      reportsTrend: buckets.map(b => ({
        label: b.label,
        totalReports: b.totalReports,
        completedReports: b.completedReports,
      })),
      recentReports,
    });
  } catch (error: any) {
    console.error('Error fetching clinical analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch clinical analytics' },
      { status: 500 }
    );
  }
}
