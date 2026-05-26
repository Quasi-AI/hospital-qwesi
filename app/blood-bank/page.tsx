'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import { useTranslations } from '../hooks/useTranslations';
import { 
  Droplets,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle,
  Plus,
  Package,
  Activity,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

interface InventoryStats {
  availableByGroup: { bloodGroup: string; count: number; totalVolume: number }[];
  availableByComponent: { component: string; count: number; totalVolume: number }[];
  statusCounts: Record<string, number>;
  testingStatusCounts: Record<string, number>;
  expiringSoon: number;
  expiredNotDiscarded: number;
  lowStockGroups: { bloodGroup: string; count: number }[];
  totalAvailable: number;
}

export default function BloodBankPage() {
  const { t, translationsLoaded } = useTranslations();
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentTransfusions, setRecentTransfusions] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, transfusionsRes] = await Promise.all([
        fetch('/api/blood-bank/inventory/stats'),
        fetch('/api/blood-bank/transfusions?activeOnly=true')
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (transfusionsRes.ok) {
        const transfusionsData = await transfusionsRes.json();
        setRecentTransfusions(transfusionsData.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(t('bloodBank.fetchError') || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const getBloodGroupColor = (group: string) => {
    const colors: Record<string, string> = {
      'A+': 'bg-red-100 text-red-700 border-red-200',
      'A-': 'bg-red-50 text-red-600 border-red-100',
      'B+': 'bg-blue-100 text-blue-700 border-blue-200',
      'B-': 'bg-blue-50 text-blue-600 border-blue-100',
      'AB+': 'bg-purple-100 text-purple-700 border-purple-200',
      'AB-': 'bg-purple-50 text-purple-600 border-purple-100',
      'O+': 'bg-green-100 text-green-700 border-green-200',
      'O-': 'bg-green-50 text-green-600 border-green-100',
    };
    return colors[group] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'life-threatening':
        return 'bg-red-100 text-red-800';
      case 'emergency':
        return 'bg-orange-100 text-orange-800';
      case 'urgent':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getComponentLabel = (component: string) => {
    const labels: Record<string, string> = {
      'whole-blood': 'Whole Blood',
      'packed-rbc': 'Packed RBC',
      'platelets': 'Platelets',
      'plasma': 'Plasma',
      'cryoprecipitate': 'Cryo',
    };
    return labels[component] || component;
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('bloodBank.title') || 'Blood Bank'} dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-red-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title={t('bloodBank.title') || 'Blood Bank'} 
        description={t('bloodBank.description') || 'Manage blood inventory, donors, and transfusions'} dense>
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-red-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-red-200 bg-red-50/80 p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-red-600">{t('bloodBank.totalAvailable') || 'Available Units'}</p>
                    <p className="text-lg font-semibold tabular-nums text-red-700">{stats?.totalAvailable || 0}</p>
                  </div>
                  <Droplets className="h-8 w-8 shrink-0 text-red-500" />
                </div>
              </div>
              <div className="rounded-lg border border-yellow-200 bg-yellow-50/80 p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-yellow-600">{t('bloodBank.expiringSoon') || 'Expiring Soon'}</p>
                    <p className="text-lg font-semibold tabular-nums text-yellow-700">{stats?.expiringSoon || 0}</p>
                  </div>
                  <Clock className="h-8 w-8 shrink-0 text-yellow-500" />
                </div>
              </div>
              <div className="rounded-lg border border-orange-200 bg-orange-50/80 p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-orange-600">{t('bloodBank.pendingRequests') || 'Active Requests'}</p>
                    <p className="text-lg font-semibold tabular-nums text-orange-700">{recentTransfusions.length}</p>
                  </div>
                  <Activity className="h-8 w-8 shrink-0 text-orange-500" />
                </div>
              </div>
              <div className="rounded-lg border border-purple-200 bg-purple-50/80 p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-purple-600">{t('bloodBank.lowStock') || 'Low Stock Alerts'}</p>
                    <p className="text-lg font-semibold tabular-nums text-purple-700">{stats?.lowStockGroups?.length || 0}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 shrink-0 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Low Stock Alerts */}
            {stats?.lowStockGroups && stats.lowStockGroups.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50/80 p-3 shadow-sm">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <div>
                    <h3 className="text-sm font-semibold text-red-800">{t('bloodBank.lowStockAlert') || 'Low Stock Alert'}</h3>
                    <p className="mt-0.5 text-xs text-red-600">
                      {t('bloodBank.lowStockMessage') || 'The following blood groups have less than 5 units available:'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {stats.lowStockGroups.map((group) => (
                        <span
                          key={group.bloodGroup}
                          className={`rounded-md border px-2 py-0.5 text-xs font-medium ${getBloodGroupColor(group.bloodGroup)}`}
                        >
                          {group.bloodGroup}: {group.count} units
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Link
                href="/blood-bank/inventory"
                className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="rounded-md bg-red-100 p-2">
                  <Package className="h-4 w-4 text-red-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{t('bloodBank.inventory') || 'Inventory'}</p>
                  <p className="text-xs text-gray-500">{t('bloodBank.manageStock') || 'Manage stock'}</p>
                </div>
              </Link>
              <Link
                href="/blood-bank/donors"
                className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="rounded-md bg-blue-100 p-2">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{t('bloodBank.donors') || 'Donors'}</p>
                  <p className="text-xs text-gray-500">{t('bloodBank.manageDonors') || 'Manage donors'}</p>
                </div>
              </Link>
              <Link
                href="/blood-bank/transfusions"
                className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="rounded-md bg-purple-100 p-2">
                  <Activity className="h-4 w-4 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{t('bloodBank.transfusions') || 'Transfusions'}</p>
                  <p className="text-xs text-gray-500">{t('bloodBank.manageRequests') || 'Manage requests'}</p>
                </div>
              </Link>
              <Link
                href="/blood-bank/transfusions/new"
                className="flex items-center gap-2.5 rounded-lg bg-red-600 p-3 text-white shadow-sm transition-colors hover:bg-red-700"
              >
                <div className="rounded-md bg-red-500 p-2">
                  <Plus className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t('bloodBank.newRequest') || 'New Request'}</p>
                  <p className="text-xs text-red-100">{t('bloodBank.requestBlood') || 'Request blood'}</p>
                </div>
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Blood Group Inventory */}
              <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">{t('bloodBank.inventoryByGroup') || 'Inventory by Blood Group'}</h3>
                  <Link href="/blood-bank/inventory" className="flex items-center text-xs font-medium text-red-600 hover:text-red-700">
                    {t('common.viewAll') || 'View All'} <ArrowRight className="ml-0.5 h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {stats?.availableByGroup?.map((item) => (
                    <div
                      key={item.bloodGroup}
                      className={`rounded-md border p-2 text-center ${getBloodGroupColor(item.bloodGroup)}`}
                    >
                      <p className="text-base font-bold">{item.bloodGroup}</p>
                      <p className="text-sm font-semibold">{item.count}</p>
                      <p className="text-[10px] opacity-80">{t('bloodBank.units') || 'units'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Component Inventory */}
              <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">{t('bloodBank.inventoryByComponent') || 'Inventory by Component'}</h3>
                </div>
                <div className="space-y-1.5">
                  {stats?.availableByComponent?.map((item) => (
                    <div key={item.component} className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50/80 p-2.5">
                      <div className="flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium text-gray-900">{getComponentLabel(item.component)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold tabular-nums text-gray-900">{item.count}</span>
                        <span className="ml-1 text-xs text-gray-500">{t('bloodBank.units') || 'units'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Transfusion Requests */}
            <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
                <h3 className="text-sm font-semibold text-gray-900">{t('bloodBank.recentRequests') || 'Active Transfusion Requests'}</h3>
                <Link href="/blood-bank/transfusions" className="flex items-center text-xs font-medium text-red-600 hover:text-red-700">
                  {t('common.viewAll') || 'View All'} <ArrowRight className="ml-0.5 h-3.5 w-3.5" />
                </Link>
              </div>
              {recentTransfusions.length === 0 ? (
                <div className="p-6 text-center">
                  <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-500" />
                  <p className="text-sm text-gray-600">{t('bloodBank.noActiveRequests') || 'No active transfusion requests'}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentTransfusions.map((transfusion) => (
                    <Link
                      key={transfusion._id}
                      href={`/blood-bank/transfusions/${transfusion._id}`}
                      className="flex items-center justify-between gap-3 p-3 hover:bg-gray-50/80"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${getBloodGroupColor(transfusion.requestedBloodGroup)}`}>
                          <span className="text-sm font-bold">{transfusion.requestedBloodGroup}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">{transfusion.patientName}</p>
                          <p className="text-xs text-gray-500">
                            {transfusion.requestNumber} • {transfusion.unitsRequested} {t('bloodBank.units') || 'units'} {getComponentLabel(transfusion.requestedComponent)}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${getUrgencyColor(transfusion.urgency)}`}>
                          {transfusion.urgency}
                        </span>
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${getStatusColor(transfusion.status)}`}>
                          {transfusion.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SidebarLayout>
    </ProtectedRoute>
  );
}
