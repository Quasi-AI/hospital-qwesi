'use client';

import { useEffect, useState } from 'react';
import {
  Calendar,
  TrendingUp,
  Clock,
  X,
  CheckCircle,
  BarChart3,
  Filter,
  Download
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

export default function AppointmentAnalyticsPage() {
  const { t, translationsLoaded } = useTranslations();
  const [dateRange, setDateRange] = useState('month');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/analytics/appointment?dateRange=${dateRange}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error('Error fetching appointment analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  const PIE_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#64748b'];
  const typeChartData = Object.entries(data?.typeDistribution || {}).map(([name, value]) => ({
    name,
    value: typeof value === 'number' ? value : Number(value || 0),
  }));
  const statusChartData = Object.entries(data?.statusBreakdown || {}).map(([name, value]) => ({
    name,
    value: typeof value === 'number' ? value : Number(value || 0),
  }));

  const handleExport = () => {
    if (!data) return;
    const rows: any[][] = [
      ['Metric', 'Value'],
      ['Total Appointments', data.totalAppointments ?? 0],
      ['Completed', data.completed ?? 0],
      ['Cancelled', data.cancelled ?? 0],
      ['Completion Rate (%)', data.completionRate ?? 0],
      ['No-Show Rate (%)', data.noShowRate ?? 0],
      ['Average Duration (min)', data.averageDuration ?? 0],
      [],
      ['Appointment Trend'],
      ['Label', 'Total', 'Completed', 'Cancelled', 'NoShowRate(%)'],
      ...(Array.isArray(data.appointmentTrend)
        ? data.appointmentTrend.map((p: any) => [p.label, p.total ?? 0, p.completed ?? 0, p.cancelled ?? 0, p.noShowRate ?? 0])
        : []),
      [],
      ['Distribution'],
      ['Key', 'Count'],
      ...((showStatus ? statusChartData : typeChartData).map((p: any) => [p.name, p.value])),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appointment-analytics-${dateRange}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('navigation.appointmentAnalytics')} description="" dense>
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
        title={t('navigation.appointmentAnalytics')}
        description="Appointment trends, no-show rates, and scheduling efficiency" dense>
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
                  onClick={() => setShowStatus((v) => !v)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Filter className="h-4 w-4" />
                  <span>{showStatus ? 'Status' : 'Filter'}</span>
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

          {/* Appointment Metrics */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="rounded-md bg-blue-100 p-1.5">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Total Appointments</p>
              <p className="text-lg font-bold text-gray-900">{data?.totalAppointments ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">This period</p>
            </div>

            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="rounded-md bg-green-100 p-1.5">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Completed</p>
              <p className="text-lg font-bold text-gray-900">{data?.completed ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">{(Number(data?.completionRate || 0)).toFixed(1)}% completion rate</p>
            </div>

            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="rounded-md bg-red-100 p-1.5">
                  <X className="h-5 w-5 text-red-600" />
                </div>
                <TrendingUp className="h-4 w-4 text-red-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">No-Show Rate</p>
              <p className="text-lg font-bold text-gray-900">{(Number(data?.noShowRate || 0)).toFixed(1)}%</p>
              <p className="text-xs text-gray-500 mt-1">Missed appointments</p>
            </div>

            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="rounded-md bg-purple-100 p-1.5">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Average Duration</p>
              <p className="text-lg font-bold text-gray-900">{Math.round(Number(data?.averageDuration || 0))} min</p>
              <p className="text-xs text-gray-500 mt-1">Per appointment</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Appointment Trends</h3>
              <div className="h-64">
                {Array.isArray(data?.appointmentTrend) && data.appointmentTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.appointmentTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="total" name="Total" stroke="#2563eb" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="completed" name="Completed" stroke="#16a34a" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="cancelled" name="Cancelled" stroke="#ef4444" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                      <p>No trend data</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">{showStatus ? 'Status Breakdown' : 'Type Distribution'}</h3>
              <div className="h-64">
                {(showStatus ? statusChartData : typeChartData).length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Tooltip />
                      <Legend />
                      <Pie data={showStatus ? statusChartData : typeChartData} dataKey="value" nameKey="name" outerRadius={90} label>
                        {(showStatus ? statusChartData : typeChartData).map((_: any, idx: number) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                    </RePieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <Calendar className="h-12 w-12 mx-auto mb-2" />
                      <p>No distribution data</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Analytics Table */}
          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Appointment Analytics</h3>
            {Array.isArray(data?.recentAppointments) && data.recentAppointments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Patient</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Doctor</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {data.recentAppointments.map((a: any) => (
                      <tr key={a._id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-gray-900">{a.patientName || '—'}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{a.doctorName || '—'}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{a.appointmentType || '—'}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{a.status || '—'}</td>
                        <td className="px-3 py-2 text-right text-sm text-gray-700">
                          {a.appointmentDate ? new Date(a.appointmentDate).toLocaleDateString() : '—'} {a.appointmentTime ? ` ${a.appointmentTime}` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No appointments found</p>
              </div>
            )}
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
