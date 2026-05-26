'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import ProtectedRoute from '../../../../protected-route';
import SidebarLayout from '../../../../components/sidebar-layout';
import { useTranslations } from '../../../../hooks/useTranslations';

export default function EditServiceItemPage() {
  const router = useRouter();
  const params = useParams();
  const { t, translationsLoaded } = useTranslations();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unitPrice: '',
    serviceType: 'consultation' as 'consultation' | 'procedure' | 'test' | 'medication' | 'room' | 'other',
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchServiceItem();
    }
  }, [params.id]);

  const fetchServiceItem = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/billing/service-items/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        const item = data.serviceItem;
        setFormData({
          name: item.name || '',
          description: item.description || '',
          unitPrice: item.unitPrice?.toString() || '',
          serviceType: item.serviceType || 'consultation',
          isActive: item.isActive !== undefined ? item.isActive : true,
        });
      } else {
        alert(t('billing.serviceItems.notFound'));
        router.push('/billing/service-items');
      }
    } catch (error) {
      console.error('Error fetching service item:', error);
      alert(t('billing.serviceItems.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!translationsLoaded || loading) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.description || !formData.unitPrice) {
      alert(t('billing.serviceItems.validation.required'));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/billing/service-items/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          unitPrice: parseFloat(formData.unitPrice),
        }),
      });

      if (response.ok) {
        router.push('/billing/service-items');
      } else {
        const error = await response.json();
        alert(error.error || t('billing.serviceItems.updateFailed'));
      }
    } catch (error) {
      console.error('Error updating service item:', error);
      alert(t('billing.serviceItems.updateFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <SidebarLayout
        title={t('billing.serviceItems.editItem')}
        description={t('billing.serviceItems.description')} dense>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Link
              href="/billing/service-items"
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t('common.back')}</span>
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {t('billing.serviceItems.name')} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {t('billing.serviceItems.description')} *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  {t('billing.serviceItems.unitPrice')} *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  {t('billing.serviceItems.serviceType')} *
                </label>
                <select
                  value={formData.serviceType}
                  onChange={(e) => setFormData({ ...formData, serviceType: e.target.value as any })}
                  className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                >
                  <option value="consultation">{t('billing.serviceTypes.consultation')}</option>
                  <option value="procedure">{t('billing.serviceTypes.procedure')}</option>
                  <option value="test">{t('billing.serviceTypes.test')}</option>
                  <option value="medication">{t('billing.serviceTypes.medication')}</option>
                  <option value="room">{t('billing.serviceTypes.room')}</option>
                  <option value="other">{t('billing.serviceTypes.other')}</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">
                {t('billing.serviceItems.active')}
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
              <Link
                href="/billing/service-items"
                className="inline-flex h-9 items-center rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('common.cancel')}
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{t('common.save')}</span>
              </button>
            </div>
          </form>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
