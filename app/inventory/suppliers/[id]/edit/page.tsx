'use client';

import { useState, useEffect, use, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations } from '@/app/hooks/useTranslations';
import { ArrowLeft, Save, Users } from 'lucide-react';

function EditSupplierForm({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { t, translationsLoaded } = useTranslations();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '', contactPerson: '', email: '', phone: '', alternatePhone: '',
    street: '', city: '', state: '', postalCode: '', country: '',
    supplyType: [] as string[], taxId: '', licenseNumber: '', paymentTerms: '', creditLimit: 0, notes: '',
    isActive: true,
  });

  useEffect(() => {
    fetchSupplier();
  }, [resolvedParams.id]);

  const fetchSupplier = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/inventory/suppliers/${resolvedParams.id}`);
      if (response.ok) {
        const supplier = await response.json();
        setFormData({
          name: supplier.name || '',
          contactPerson: supplier.contactPerson || '',
          email: supplier.email || '',
          phone: supplier.phone || '',
          alternatePhone: supplier.alternatePhone || '',
          street: supplier.address?.street || '',
          city: supplier.address?.city || '',
          state: supplier.address?.state || '',
          postalCode: supplier.address?.postalCode || '',
          country: supplier.address?.country || '',
          supplyType: supplier.supplyType || [],
          taxId: supplier.taxId || '',
          licenseNumber: supplier.licenseNumber || '',
          paymentTerms: supplier.paymentTerms || '',
          creditLimit: supplier.creditLimit || 0,
          notes: supplier.notes || '',
          isActive: supplier.isActive !== undefined ? supplier.isActive : true,
        });
      } else {
        setError('Supplier not found');
      }
    } catch (err) {
      console.error('Error fetching supplier:', err);
      setError('Failed to load supplier data');
    } finally {
      setLoading(false);
    }
  };

  const handleSupplyTypeChange = (type: string) => {
    setFormData(prev => ({
      ...prev,
      supplyType: prev.supplyType.includes(type)
        ? prev.supplyType.filter(t => t !== type)
        : [...prev.supplyType, type]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.supplyType.length === 0) {
      setError(t('inventory.pleaseSelectSupplyType'));
      return;
    }
    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/inventory/suppliers/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          address: {
            street: formData.street,
            city: formData.city,
            state: formData.state,
            postalCode: formData.postalCode,
            country: formData.country
          },
          creditLimit: Number(formData.creditLimit) || 0,
        }),
      });
      if (response.ok) {
        router.push('/inventory/suppliers');
      } else {
        const data = await response.json();
        setError(data.error || t('common.error'));
      }
    } catch (err) {
      setError(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const supplyTypes = ['medicines', 'equipment', 'consumables', 'all'];

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('inventory.editSupplier')} description="" dense>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('inventory.editSupplier')} description="" dense>
          <div className="flex items-center justify-center h-48 gap-2">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600 shrink-0"></div>
            <span className="text-sm text-gray-600">Loading supplier data...</span>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout
        title={t('inventory.editSupplier')}
        description={t('inventory.editSupplierDescription')} dense>
        <div className="max-w-3xl">
          <Link
            href="/inventory/suppliers"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-3"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span>{t('common.back')}</span>
          </Link>

          {error && (
            <div className="mb-3 p-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Basic Info */}
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600 shrink-0" />
                {t('inventory.supplierInfo')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('inventory.supplierName')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('inventory.contactPerson')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('inventory.email')} *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('inventory.phone')} *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('inventory.alternatePhone')}
                  </label>
                  <input
                    type="tel"
                    value={formData.alternatePhone}
                    onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    {t('inventory.supplyType')} *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {supplyTypes.map((type) => (
                      <label key={type} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.supplyType.includes(type)}
                          onChange={() => handleSupplyTypeChange(type)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm">{t(`inventory.supplyTypes.${type}`)}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="text-xs text-gray-700">
                    {t('common.active')}
                  </label>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3">{t('inventory.address')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('inventory.street')}
                  </label>
                  <input
                    type="text"
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('inventory.city')}
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('inventory.state')}
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('inventory.postalCode')}
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('inventory.country')}
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Business Info */}
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3">{t('inventory.businessInfo')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('inventory.taxId')}
                  </label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('inventory.licenseNumber')}
                  </label>
                  <input
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('inventory.paymentTerms')}
                  </label>
                  <input
                    type="text"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Net 30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('inventory.creditLimit')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('inventory.notes')}
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full min-h-[4.5rem] px-2.5 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 h-9 px-4 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4 shrink-0" />
                <span>{saving ? t('common.saving') : t('common.save')}</span>
              </button>
              <Link
                href="/inventory/suppliers"
                className="inline-flex items-center h-9 px-4 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t('common.cancel')}
              </Link>
            </div>
          </form>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}

export default function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={
      <ProtectedRoute>
        <SidebarLayout title="" description="" dense>
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    }>
      <EditSupplierForm params={params} />
    </Suspense>
  );
}
