import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import Payment from '@/models/Payment';

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
  const series: Array<{ key: string; label: string; revenue: number; paid: number }> = [];

  if (bucketType === 'month') {
    let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endMonth = new Date(endDateExclusive.getFullYear(), endDateExclusive.getMonth(), 1);
    while (cursor <= endMonth) {
      const key = formatMonthKey(cursor);
      const label = cursor.toLocaleString(undefined, { month: 'short' });
      series.push({ key, label, revenue: 0, paid: 0 });
      cursor = addMonths(cursor, 1);
    }
    return series;
  }

  if (bucketType === 'week') {
    let cursor = startOfDay(startDate);
    while (cursor < endDateExclusive) {
      const key = formatIsoWeekKey(cursor);
      if (!series.some(s => s.key === key)) {
        series.push({ key, label: key, revenue: 0, paid: 0 });
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
    series.push({ key, label, revenue: 0, paid: 0 });
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

    // Fetch invoices in date range
    const invoices = await Invoice.find({
      createdAt: { $gte: startDate, $lt: endDate }
    }).lean();

    // Fetch payments in date range
    const payments = await Payment.find({
      paymentDate: { $gte: startDate, $lt: endDate },
      status: 'completed'
    }).lean();

    // Calculate metrics
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const paidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const outstandingInvoices = await Invoice.find({ status: { $in: ['pending', 'partial'] } }).lean();
    const outstandingIds = outstandingInvoices.map((inv: any) => inv._id?.toString()).filter(Boolean);
    const outstandingPayments = outstandingIds.length
      ? await Payment.find({ invoiceId: { $in: outstandingIds }, status: 'completed' }).lean()
      : [];
    const paidByInvoice: Record<string, number> = {};
    outstandingPayments.forEach((p: any) => {
      const id = p.invoiceId?.toString();
      if (!id) return;
      paidByInvoice[id] = (paidByInvoice[id] || 0) + (p.amount || 0);
    });
    const outstandingAmount = outstandingInvoices.reduce((sum, inv: any) => {
      const id = inv._id?.toString();
      const paid = id ? (paidByInvoice[id] || 0) : 0;
      return sum + (inv.total || 0) - paid;
    }, 0);
    const averageInvoice = invoices.length > 0 ? totalRevenue / invoices.length : 0;

    // Payment methods distribution
    const paymentMethods: Record<string, number> = {};
    payments.forEach(p => {
      const method = p.paymentMethod || 'unknown';
      paymentMethods[method] = (paymentMethods[method] || 0) + (p.amount || 0);
    });

    // Revenue trend buckets
    const bucketType = getBucketType(dateRange);
    const buckets = buildBuckets(startDate, endDate, bucketType);
    const bucketIndex = new Map(buckets.map((b, i) => [b.key, i]));

    invoices.forEach((inv: any) => {
      const d = inv.createdAt ? new Date(inv.createdAt) : null;
      if (!d) return;
      const key =
        bucketType === 'month' ? formatMonthKey(d) :
        bucketType === 'week' ? formatIsoWeekKey(d) :
        formatDayKey(d);
      const idx = bucketIndex.get(key);
      if (idx === undefined) return;
      buckets[idx].revenue += (inv.total || 0);
    });

    payments.forEach((p: any) => {
      const d = p.paymentDate ? new Date(p.paymentDate) : null;
      if (!d) return;
      const key =
        bucketType === 'month' ? formatMonthKey(d) :
        bucketType === 'week' ? formatIsoWeekKey(d) :
        formatDayKey(d);
      const idx = bucketIndex.get(key);
      if (idx === undefined) return;
      buckets[idx].paid += (p.amount || 0);
    });

    // Small invoice lists for UI tables
    const recentInvoices = await Invoice.find({
      createdAt: { $gte: startDate, $lt: endDate }
    })
      .select('invoiceNumber patientName total status createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const outstandingInvoicesPreview = await Invoice.find({ status: { $in: ['pending', 'partial'] } })
      .select('invoiceNumber patientName total status createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Previous period for comparison
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - periodDays);
    const prevEndDate = new Date(startDate);

    const prevInvoices = await Invoice.find({
      createdAt: { $gte: prevStartDate, $lt: prevEndDate }
    }).lean();
    const prevRevenue = prevInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    return NextResponse.json({
      totalRevenue,
      paidAmount,
      outstandingAmount,
      averageInvoice,
      invoiceCount: invoices.length,
      outstandingCount: outstandingInvoices.length,
      revenueChange,
      paymentMethods,
      revenueTrend: buckets.map(b => ({
        label: b.label,
        revenue: Number(b.revenue.toFixed(2)),
        paid: Number(b.paid.toFixed(2)),
      })),
      recentInvoices,
      outstandingInvoicesPreview,
    });
  } catch (error: any) {
    console.error('Error fetching financial analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch financial analytics' },
      { status: 500 }
    );
  }
}
