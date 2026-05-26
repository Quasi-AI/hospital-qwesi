'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  TrendingUp,
  Users,
  Stethoscope,
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

export default function ClinicalAnalyticsPage() {
  const { t, translationsLoaded } = useTranslations();
  const [dateRange, setDateRange] = useState('month');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [showStatusBreakdown, setShowStatusBreakdown] = useState(false);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/clinical?dateRange=${dateRange}`);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Error fetching clinical analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const PIE_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#64748b'];

  const reportTypeChartData = Object.entries(data?.diseaseTrends || {}).map(([name, value]) => ({
    name,
    value: typeof value === 'number' ? value : Number(value || 0),
  }));

  const statusChartData = Object.entries(data?.reportStatusBreakdown || {}).map(([name, value]) => ({
    name,
    value: typeof value === 'number' ? value : Number(value || 0),
  }));

  const handleExport = () => {
    if (!data) return;
    const rows: any[][] = [
      ['Metric', 'Value'],
      ['Patient Outcomes', data.patientOutcomes ?? 0],
      ['Treatment Effectiveness (%)', data.treatmentEffectiveness ?? 0],
      ['Total Reports', data.totalReports ?? 0],
      ['Completed Reports', data.completedReports ?? 0],
      ['Active Cases', data.activeCases ?? 0],
      ['Total Appointments', data.totalAppointments ?? 0],
      ['Completed Appointments', data.completedAppointments ?? 0],
      [],
      ['Reports Trend'],
      ['Label', 'Total Reports', 'Completed Reports'],
      ...(Array.isArray(data.reportsTrend) ? data.reportsTrend.map((p: any) => [p.label, p.totalReports ?? 0, p.completedReports ?? 0]) : []),
      [],
      ['Report Types'],
      ['Type', 'Count'],
      ...reportTypeChartData.map((p: any) => [p.name, p.value]),
      [],
      ['Report Status'],
      ['Status', 'Count'],
      ...statusChartData.map((p: any) => [p.name, p.value]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clinical-analytics-${dateRange}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('navigation.clinicalAnalytics')} description="" dense>
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
        title={t('navigation.clinicalAnalytics')}
        description="Clinical analytics, patient outcomes, and treatment effectiveness" dense>
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
                  onClick={() => setShowStatusBreakdown((v) => !v)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Filter className="h-4 w-4" />
                  <span>{showStatusBreakdown ? 'Showing Status' : 'Filter'}</span>
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

          {/* Clinical Metrics */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="rounded-md bg-blue-100 p-1.5">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Patient Outcomes</p>
              <p className="text-lg font-bold text-gray-900">{data?.patientOutcomes || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Success rate</p>
            </div>

            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="rounded-md bg-green-100 p-1.5">
                  <Stethoscope className="h-5 w-5 text-green-600" />
                </div>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Treatment Effectiveness</p>
              <p className="text-lg font-bold text-gray-900">{data?.treatmentEffectiveness?.toFixed(1) || '0'}%</p>
              <p className="text-xs text-gray-500 mt-1">Average improvement</p>
            </div>

            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="rounded-md bg-purple-100 p-1.5">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Disease Trends</p>
              <p className="text-lg font-bold text-gray-900">{Object.keys(data?.diseaseTrends || {}).length || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Active cases</p>
            </div>

            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="rounded-md bg-orange-100 p-1.5">
                  <BarChart3 className="h-5 w-5 text-orange-600" />
                </div>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Clinical Metrics</p>
              <p className="text-lg font-bold text-gray-900">{data?.totalReports || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Key indicators</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Patient Outcomes Trend</h3>
              <div className="h-64">
                {Array.isArray(data?.reportsTrend) && data.reportsTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.reportsTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="totalReports" name="Total Reports" stroke="#2563eb" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="completedReports" name="Completed" stroke="#16a34a" strokeWidth={2} dot={false} />
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
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                {showStatusBreakdown ? 'Report Status' : 'Report Types'}
              </h3>
              <div className="h-64">
                {(showStatusBreakdown ? statusChartData : reportTypeChartData).length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Tooltip />
                      <Legend />
                      <Pie
                        data={showStatusBreakdown ? statusChartData : reportTypeChartData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={90}
                        label
                      >
                        {(showStatusBreakdown ? statusChartData : reportTypeChartData).map((_: any, idx: number) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                    </RePieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <Activity className="h-12 w-12 mx-auto mb-2" />
                      <p>No distribution data available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Analytics Table */}
          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Clinical Analytics</h3>
            {Array.isArray(data?.recentReports) && data.recentReports.length > 0 ? (
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
                    {data.recentReports.map((r: any) => (
                      <tr key={r._id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-gray-900">{r.patientName || '—'}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{r.doctorName || '—'}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{r.reportType || '—'}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{r.status || '—'}</td>
                        <td className="px-3 py-2 text-sm text-gray-700 text-right">
                          {r.reportDate ? new Date(r.reportDate).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No recent reports found</p>
              </div>
            )}
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
