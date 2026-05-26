'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations } from '@/app/hooks/useTranslations';
import { useFormatCurrency } from '@/app/hooks/useFormatCurrency';
import { ClipboardList, Package, Plus, RefreshCw } from 'lucide-react';

interface DispensingRow {
  _id: string;
  dispensingNumber: string;
  patientName: string;
  doctorName?: string;
  items: { medicineName: string; quantity: number }[];
  totalAmount: number;
  paymentStatus: string;
  status: string;
  createdAt: string;
}

export default function DispensingListPage() {
  const { t, translationsLoaded } = useTranslations();
  const { formatCurrency } = useFormatCurrency();
  const [rows, setRows] = useState<DispensingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchRows = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/pharmacy/dispensing?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [statusFilter]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title="" description="" dense>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout title={t('pharmacy.dispensingList')} description={t('pharmacy.dispensingListDescription')} dense>
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 border border-gray-300 rounded-md px-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t('pharmacy.allStatuses')}</option>
                <option value="pending">{t('pharmacy.dispensingStatus.pending')}</option>
                <option value="processing">{t('pharmacy.dispensingStatus.processing')}</option>
                <option value="ready">{t('pharmacy.dispensingStatus.ready')}</option>
                <option value="dispensed">{t('pharmacy.dispensingStatus.dispensed')}</option>
                <option value="cancelled">{t('pharmacy.dispensingStatus.cancelled')}</option>
                <option value="returned">{t('pharmacy.dispensingStatus.returned')}</option>
              </select>
              <button
                type="button"
                onClick={() => fetchRows()}
                className="inline-flex items-center gap-1.5 h-9 px-3 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 shrink-0" />
                {t('common.refresh')}
              </button>
            </div>
            <div className="flex gap-2">
              <Link
                href="/pharmacy/dispensing"
                className="inline-flex items-center gap-1.5 h-9 px-3 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 shrink-0" />
                {t('pharmacy.dispensing')}
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
                <p className="mt-3 text-sm text-gray-600">{t('common.loading')}</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-8 px-4">
                <ClipboardList className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-700 font-medium">{t('pharmacy.noDispensingRecords')}</p>
                <p className="text-xs text-gray-500 mt-1 mb-3">{t('pharmacy.noDispensingRecordsDesc')}</p>
                <Link
                  href="/pharmacy/dispensing"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  <Package className="h-4 w-4 shrink-0" />
                  {t('pharmacy.dispensing')}
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('pharmacy.dispensingNumber')}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('pharmacy.patient')}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('pharmacy.dispensingItemsCount')}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('pharmacy.total')}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('pharmacy.paymentStatus')}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('pharmacy.dispensingStatusLabel')}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('pharmacy.dispensingDate')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rows.map((row) => (
                      <tr key={row._id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm font-mono font-medium text-gray-900">{row.dispensingNumber}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{row.patientName}</td>
                        <td className="px-3 py-2 text-sm text-gray-600">{row.items?.length ?? 0}</td>
                        <td className="px-3 py-2 text-sm text-right font-medium text-gray-900">
                          {formatCurrency(row.totalAmount)}
                        </td>
                        <td className="px-3 py-2 text-sm">
                          <span className="inline-flex px-1.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-800">
                            {t(`pharmacy.paymentStatusLabels.${row.paymentStatus}`)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm">
                          <span className="inline-flex px-1.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-800">
                            {t(`pharmacy.dispensingStatus.${row.status}`)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">{formatDate(row.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
