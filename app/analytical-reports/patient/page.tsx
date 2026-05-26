'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  TrendingUp,
  Calendar,
  MapPin,
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

export default function PatientAnalyticsPage() {
  const { t, translationsLoaded } = useTranslations();
  const [dateRange, setDateRange] = useState('month');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [showGender, setShowGender] = useState(false);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/analytics/patient?dateRange=${dateRange}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error('Error fetching patient analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  const PIE_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#64748b'];

  const ageChartData = Object.entries(data?.ageGroups || {}).map(([name, value]) => ({
    name,
    value: typeof value === 'number' ? value : Number(value || 0),
  }));
  const genderChartData = Object.entries(data?.genderDistribution || {}).map(([name, value]) => ({
    name,
    value: typeof value === 'number' ? value : Number(value || 0),
  }));

  const handleExport = () => {
    if (!data) return;
    const rows: any[][] = [
      ['Metric', 'Value'],
      ['Total Patients', data.totalPatients ?? 0],
      ['Active Patients', data.activePatients ?? 0],
      ['Average Visits (per patient)', data.averageVisits ?? 0],
      ['Satisfaction Rate (%)', data.satisfactionRate ?? 0],
      [],
      ['Patient Trend'],
      ['Label', 'Visits', 'New Patients'],
      ...(Array.isArray(data.patientTrend) ? data.patientTrend.map((p: any) => [p.label, p.visits ?? 0, p.newPatients ?? 0]) : []),
      [],
      ['Age Groups'],
      ['Group', 'Count'],
      ...ageChartData.map((p: any) => [p.name, p.value]),
      [],
      ['Gender'],
      ['Gender', 'Count'],
      ...genderChartData.map((p: any) => [p.name, p.value]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patient-analytics-${dateRange}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('navigation.patientAnalytics')} description="" dense>
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
        title={t('navigation.patientAnalytics')}
        description="Patient demographics, visit patterns, and satisfaction metrics" dense>
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
                  onClick={() => setShowGender((v) => !v)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Filter className="h-4 w-4" />
                  <span>{showGender ? 'Gender' : 'Filter'}</span>
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

          {/* Patient Metrics */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="rounded-md bg-indigo-100 p-1.5">
                  <Users className="h-5 w-5 text-indigo-600" />
                </div>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Total Patients</p>
              <p className="text-lg font-bold text-gray-900">{data?.totalPatients ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">{data?.activePatients ?? 0} active in range</p>
            </div>

            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="rounded-md bg-blue-100 p-1.5">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Average Visits</p>
              <p className="text-lg font-bold text-gray-900">{(Number(data?.averageVisits || 0)).toFixed(1)}</p>
              <p className="text-xs text-gray-500 mt-1">Visits per patient (active)</p>
            </div>

            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="rounded-md bg-green-100 p-1.5">
                  <MapPin className="h-5 w-5 text-green-600" />
                </div>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Demographics</p>
              <p className="text-lg font-bold text-gray-900">{ageChartData.length}</p>
              <p className="text-xs text-gray-500 mt-1">{showGender ? 'Gender groups' : 'Age groups'}</p>
            </div>

            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="rounded-md bg-purple-100 p-1.5">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Satisfaction Rate</p>
              <p className="text-lg font-bold text-gray-900">{(Number(data?.satisfactionRate || 0)).toFixed(1)}%</p>
              <p className="text-xs text-gray-500 mt-1">Based on completed visits</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Patient Demographics</h3>
              <div className="h-64">
                {(showGender ? genderChartData : ageChartData).length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Tooltip />
                      <Legend />
                      <Pie data={showGender ? genderChartData : ageChartData} dataKey="value" nameKey="name" outerRadius={90} label>
                        {(showGender ? genderChartData : ageChartData).map((_: any, idx: number) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                    </RePieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                      <p>No demographics data</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Visit Patterns</h3>
              <div className="h-64">
                {Array.isArray(data?.patientTrend) && data.patientTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.patientTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="visits" name="Visits" stroke="#2563eb" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="newPatients" name="New Patients" stroke="#16a34a" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <Calendar className="h-12 w-12 mx-auto mb-2" />
                      <p>No visit trend data</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Analytics Table */}
          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Patient Analytics</h3>
            {Array.isArray(data?.recentPatients) && data.recentPatients.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Patient</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Email</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Gender</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Age</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {data.recentPatients.map((p: any) => (
                      <tr key={p._id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-gray-900">{p.name || '—'}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{p.email || '—'}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{p.gender || '—'}</td>
                        <td className="px-3 py-2 text-right text-sm text-gray-900">{p.age ?? '—'}</td>
                        <td className="px-3 py-2 text-right text-sm text-gray-700">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No patients found</p>
              </div>
            )}
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
