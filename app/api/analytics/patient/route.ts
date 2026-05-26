import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Patient from '@/models/Patient';
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
  const series: Array<{ key: string; label: string; visits: number; newPatients: number }> = [];

  if (bucketType === 'month') {
    let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endMonth = new Date(endDateExclusive.getFullYear(), endDateExclusive.getMonth(), 1);
    while (cursor <= endMonth) {
      const key = formatMonthKey(cursor);
      const label = cursor.toLocaleString(undefined, { month: 'short' });
      series.push({ key, label, visits: 0, newPatients: 0 });
      cursor = addMonths(cursor, 1);
    }
    return series;
  }

  if (bucketType === 'week') {
    let cursor = startOfDay(startDate);
    while (cursor < endDateExclusive) {
      const key = formatIsoWeekKey(cursor);
      if (!series.some(s => s.key === key)) {
        series.push({ key, label: key, visits: 0, newPatients: 0 });
      }
      cursor = addDays(cursor, 1);
    }
    return series;
  }

  let cursor = startOfDay(startDate);
  while (cursor < endDateExclusive) {
    const key = formatDayKey(cursor);
    const label = cursor.toLocaleString(undefined, { month: 'short', day: '2-digit' });
    series.push({ key, label, visits: 0, newPatients: 0 });
    cursor = addDays(cursor, 1);
  }
  return series;
}

function safeAge(dateOfBirth: any) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  const age = Math.floor((now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  return Number.isFinite(age) && age >= 0 ? age : null;
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

    const totalPatients = await Patient.countDocuments({});

    const patients = await Patient.find({})
      .select('name email gender dateOfBirth createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const appointments = await Appointment.find({
      appointmentDate: { $gte: startDate, $lt: endDate }
    })
      .select('appointmentDate status patientEmail patientId appointmentType')
      .lean();

    const uniquePatientsInRange = new Set<string>();
    appointments.forEach((a: any) => {
      const key = (a.patientEmail || a.patientId || '').toString().trim().toLowerCase();
      if (key) uniquePatientsInRange.add(key);
    });
    const activePatients = uniquePatientsInRange.size;

    const averageVisits = activePatients > 0 ? appointments.length / activePatients : 0;

    const completedAppointments = appointments.filter((a: any) => a.status === 'completed').length;
    const satisfactionRate = appointments.length > 0 ? (completedAppointments / appointments.length) * 100 : 0;

    // Demographics
    const ageGroups: Record<string, number> = { '0-17': 0, '18-35': 0, '36-55': 0, '56+': 0, unknown: 0 };
    const genderDistribution: Record<string, number> = {};

    patients.forEach((p: any) => {
      const g = (p.gender || 'unknown').toString();
      genderDistribution[g] = (genderDistribution[g] || 0) + 1;

      const age = safeAge(p.dateOfBirth);
      if (age === null) {
        ageGroups.unknown += 1;
      } else if (age <= 17) {
        ageGroups['0-17'] += 1;
      } else if (age <= 35) {
        ageGroups['18-35'] += 1;
      } else if (age <= 55) {
        ageGroups['36-55'] += 1;
      } else {
        ageGroups['56+'] += 1;
      }
    });

    // Trend buckets: visits + new patient registrations
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
      buckets[idx].visits += 1;
    });

    patients.forEach((p: any) => {
      const d = p.createdAt ? new Date(p.createdAt) : null;
      if (!d) return;
      if (d < startDate || d >= endDate) return;
      const key =
        bucketType === 'month' ? formatMonthKey(d) :
        bucketType === 'week' ? formatIsoWeekKey(d) :
        formatDayKey(d);
      const idx = bucketIndex.get(key);
      if (idx === undefined) return;
      buckets[idx].newPatients += 1;
    });

    const recentPatients = patients.slice(0, 10).map((p: any) => ({
      _id: p._id,
      name: p.name,
      email: p.email,
      gender: p.gender,
      age: safeAge(p.dateOfBirth),
      createdAt: p.createdAt,
    }));

    return NextResponse.json({
      totalPatients,
      activePatients,
      averageVisits,
      satisfactionRate,
      ageGroups,
      genderDistribution,
      patientTrend: buckets.map(b => ({ label: b.label, visits: b.visits, newPatients: b.newPatients })),
      recentPatients,
    });
  } catch (error: any) {
    console.error('Error fetching patient analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch patient analytics' },
      { status: 500 }
    );
  }
}

