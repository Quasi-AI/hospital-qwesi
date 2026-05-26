'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  DollarSign,
  Filter,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import ProtectedRoute from '../../protected-route';
import SidebarLayout from '../../components/sidebar-layout';
import { useTranslations } from '../../hooks/useTranslations';
import { useFormatCurrency } from '../../hooks/useFormatCurrency';

interface ServiceItem {
  _id: string;
  name: string;
  description: string;
  unitPrice: number;
  serviceType: 'consultation' | 'procedure' | 'test' | 'medication' | 'room' | 'other';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ServiceItemsPage() {
  const { t, translationsLoaded } = useTranslations();
  const { formatCurrency } = useFormatCurrency();
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [activeOnly, setActiveOnly] = useState(false);

  useEffect(() => {
    fetchServiceItems();
  }, [serviceTypeFilter, activeOnly]);

  const fetchServiceItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (serviceTypeFilter !== 'all') {
        params.append('serviceType', serviceTypeFilter);
      }
      if (activeOnly) {
        params.append('activeOnly', 'true');
      }

      const response = await fetch(`/api/billing/service-items?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setServiceItems(data.serviceItems || []);
      } else {
        console.error('Failed to fetch service items');
      }
    } catch (error) {
      console.error('Error fetching service items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('billing.serviceItems.confirmDelete'))) {
      return;
    }

    try {
      const response = await fetch(`/api/billing/service-items/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchServiceItems();
      } else {
        alert(t('billing.serviceItems.deleteFailed'));
      }
    } catch (error) {
      console.error('Error deleting service item:', error);
      alert(t('billing.serviceItems.deleteFailed'));
    }
  };

  const filteredItems = serviceItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title="..." description="" dense>
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
        title={t('billing.serviceItems.title')}
        description={t('billing.serviceItems.description')} dense>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Link
              href="/billing"
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t('common.back')}</span>
            </Link>
            <Link
              href="/billing/service-items/new"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>{t('billing.serviceItems.addNew')}</span>
            </Link>
          </div>

          {/* Filters */}
          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:items-center">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('billing.serviceItems.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-full rounded-md border border-gray-200 bg-white pl-9 pr-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <select
                  value={serviceTypeFilter}
                  onChange={(e) => setServiceTypeFilter(e.target.value)}
                  className="h-9 w-full appearance-none rounded-md border border-gray-200 bg-white py-0 pl-9 pr-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">{t('billing.serviceItems.allTypes')}</option>
                  <option value="consultation">{t('billing.serviceTypes.consultation')}</option>
                  <option value="procedure">{t('billing.serviceTypes.procedure')}</option>
                  <option value="test">{t('billing.serviceTypes.test')}</option>
                  <option value="medication">{t('billing.serviceTypes.medication')}</option>
                  <option value="room">{t('billing.serviceTypes.room')}</option>
                  <option value="other">{t('billing.serviceTypes.other')}</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activeOnly"
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="activeOnly" className="text-sm text-gray-700">
                  {t('billing.serviceItems.activeOnly')}
                </label>
              </div>
            </div>
          </div>

          {/* Service Items List */}
          {loading ? (
            <div className="flex h-48 items-center justify-center rounded-lg border border-gray-100 bg-white shadow-sm">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-lg border border-gray-100 bg-white py-8 text-center shadow-sm">
              <Package className="mx-auto mb-3 h-10 w-10 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900">
                {t('billing.serviceItems.noItems')}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                {t('billing.serviceItems.noItemsDesc')}
              </p>
              <Link
                href="/billing/service-items/new"
                className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                <span>{t('billing.serviceItems.createItem')}</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {t('billing.serviceItems.name')}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {t('billing.serviceItems.description')}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {t('billing.serviceItems.serviceType')}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {t('billing.serviceItems.unitPrice')}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {t('billing.serviceItems.status')}
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {t('billing.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredItems.map((item) => (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-3 py-2">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate text-sm text-gray-600">
                          {item.description}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                          {t(`billing.serviceTypes.${item.serviceType}`)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(item.unitPrice)}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {item.isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            <CheckCircle2 className="h-3 w-3" />
                            {t('billing.serviceItems.active')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                            <XCircle className="h-3 w-3" />
                            {t('billing.serviceItems.inactive')}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/billing/service-items/${item._id}/edit`}
                            className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(item._id)}
                            className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
