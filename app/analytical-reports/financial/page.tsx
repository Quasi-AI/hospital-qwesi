'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RePieChart,
  Pie,
  Cell,
} from 'recharts';
import ProtectedRoute from '../../protected-route';
import SidebarLayout from '../../components/sidebar-layout';
import { useTranslations } from '../../hooks/useTranslations';
import { useFormatCurrency } from '../../hooks/useFormatCurrency';

export default function FinancialReportsPage() {
  const { t, translationsLoaded } = useTranslations();
  const { formatCurrency } = useFormatCurrency();
  const [dateRange, setDateRange] = useState('month');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [showOutstandingOnly, setShowOutstandingOnly] = useState(false);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/financial?dateRange=${dateRange}`);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Error fetching financial analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const paymentMethodChartData = Object.entries(data?.paymentMethods || {}).map(([name, value]) => ({
    name,
    value: typeof value === 'number' ? value : Number(value || 0),
  }));

  const PIE_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#64748b'];

  const handleExport = () => {
    if (!data) return;

    const metricsRows = [
      ['Metric', 'Value'],
      ['Total Revenue', data.totalRevenue ?? 0],
      ['Paid Amount', data.paidAmount ?? 0],
      ['Outstanding Amount', data.outstandingAmount ?? 0],
      ['Average Invoice', data.averageInvoice ?? 0],
      ['Invoice Count', data.invoiceCount ?? 0],
      ['Outstanding Count', data.outstandingCount ?? 0],
      ['Revenue Change (%)', data.revenueChange ?? 0],
    ];

    const trendRows = [
      [],
      ['Revenue Trend'],
      ['Label', 'Revenue', 'Paid'],
      ...(Array.isArray(data.revenueTrend) ? data.revenueTrend.map((p: any) => [p.label, p.revenue ?? 0, p.paid ?? 0]) : []),
    ];

    const invoiceRows = [
      [],
      ['Invoices'],
      ['Invoice Number', 'Patient', 'Status', 'Total', 'Created At'],
      ...((showOutstandingOnly ? data.outstandingInvoicesPreview : data.recentInvoices) || []).map((inv: any) => [
        inv.invoiceNumber ?? '',
        inv.patientName ?? '',
        inv.status ?? '',
        inv.total ?? 0,
        inv.createdAt ? new Date(inv.createdAt).toISOString() : '',
      ]),
    ];

    const csv = [...metricsRows, ...trendRows, ...invoiceRows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-analytics-${dateRange}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('navigation.financialReports')} description="" dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout
        title={t('navigation.financialReports')}
        description="Financial reports, revenue analysis, and payment tracking" dense>
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-auto"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
                <option value="custom">Custom Range</option>
              </select>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowOutstandingOnly((v) => !v)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Filter className="h-4 w-4" />
                  <span>{showOutstandingOnly ? 'Showing Outstanding' : 'Filter'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>
              </div>
            </div>
          </div>

          {loading && (
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex h-32 items-center justify-center">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
              </div>
            </div>
          )}

          {/* Financial Metrics */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="rounded-md bg-green-100 p-1.5">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(Number(data?.totalRevenue) || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {data?.revenueChange !== undefined 
                  ? `${data.revenueChange >= 0 ? '+' : ''}${data.revenueChange.toFixed(1)}% from last period`
                  : '--% from last period'}
              </p>
            </div>

            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="rounded-md bg-yellow-100 p-1.5">
                  <DollarSign className="h-5 w-5 text-yellow-600" />
                </div>
                <TrendingDown className="h-4 w-4 text-yellow-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Outstanding Payments</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(Number(data?.outstandingAmount) || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {data?.outstandingCount || 0} invoices pending
              </p>
            </div>

            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="rounded-md bg-blue-100 p-1.5">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Paid Amount</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(Number(data?.paidAmount) || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {data?.totalRevenue > 0 
                  ? `${((data.paidAmount / data.totalRevenue) * 100).toFixed(1)}% of total`
                  : '--% of total'}
              </p>
            </div>

            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="rounded-md bg-purple-100 p-1.5">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Average Invoice</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(Number(data?.averageInvoice) || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {data?.invoiceCount || 0} invoices this period
              </p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Revenue Trend</h3>
                <BarChart3 className="h-4 w-4 text-gray-400" />
              </div>
              <div className="h-64">
                {Array.isArray(data?.revenueTrend) && data.revenueTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.revenueTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#2563eb" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="paid" name="Paid" stroke="#16a34a" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                      <p>No trend data available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Payment Methods</h3>
                <PieChart className="h-4 w-4 text-gray-400" />
              </div>
              <div className="h-64">
                {paymentMethodChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Tooltip />
                      <Legend />
                      <Pie
                        data={paymentMethodChartData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={90}
                        label
                      >
                        {paymentMethodChartData.map((_: any, idx: number) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                    </RePieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <PieChart className="h-12 w-12 mx-auto mb-2" />
                      <p>No payment method data available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reports Table */}
          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              {showOutstandingOnly ? 'Outstanding Invoices' : 'Recent Invoices'}
            </h3>

            {Array.isArray((showOutstandingOnly ? data?.outstandingInvoicesPreview : data?.recentInvoices)) &&
            (showOutstandingOnly ? data.outstandingInvoicesPreview : data.recentInvoices).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Invoice</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Patient</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Total</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {(showOutstandingOnly ? data.outstandingInvoicesPreview : data.recentInvoices).map((inv: any) => (
                      <tr key={inv._id || inv.invoiceNumber} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm font-medium text-gray-900">{inv.invoiceNumber || '—'}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{inv.patientName || '—'}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{inv.status || '—'}</td>
                        <td className="px-3 py-2 text-right text-sm text-gray-900">{formatCurrency(Number(inv.total) || 0)}</td>
                        <td className="px-3 py-2 text-right text-sm text-gray-700">
                          {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No invoices found for this view</p>
              </div>
            )}
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
