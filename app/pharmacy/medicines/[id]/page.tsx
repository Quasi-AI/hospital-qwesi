'use client';

import { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations } from '@/app/hooks/useTranslations';
import { useFormatCurrency } from '@/app/hooks/useFormatCurrency';
import { ArrowLeft, Edit, Pill, Package, DollarSign, Calendar, MapPin, FileText, AlertTriangle } from 'lucide-react';

function MedicineViewContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { t, translationsLoaded } = useTranslations();
  const { formatCurrency } = useFormatCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [medicine, setMedicine] = useState<any>(null);

  useEffect(() => {
    fetchMedicine();
  }, [resolvedParams.id]);

  const fetchMedicine = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/pharmacy/medicines/${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        setMedicine(data);
      } else {
        setError('Medicine not found');
      }
    } catch (err) {
      console.error('Error fetching medicine:', err);
      setError('Failed to load medicine data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A';
    try {
      const d = new Date(date);
      return d.toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  const isExpiringSoon = (expiryDate: string | Date | null) => {
    if (!expiryDate) return false;
    try {
      const expiry = new Date(expiryDate);
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      return expiry <= thirtyDays && expiry >= new Date();
    } catch {
      return false;
    }
  };

  const isLowStock = () => {
    if (!medicine) return false;
    return medicine.currentStock <= medicine.reorderLevel;
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('pharmacy.medicine')} description="" dense>
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
        <SidebarLayout title={t('pharmacy.medicine')} description="" dense>
          <div className="flex items-center justify-center h-48 gap-2">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600 shrink-0"></div>
            <span className="text-sm text-gray-600">Loading medicine data...</span>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (error || !medicine) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('pharmacy.medicine')} description="" dense>
          <div className="text-center py-8">
            <AlertTriangle className="mx-auto h-10 w-10 text-red-400" />
            <h3 className="mt-2 text-base font-medium text-gray-900">{t('common.error')}</h3>
            <p className="mt-1 text-sm text-gray-500">{error || 'Medicine not found'}</p>
            <div className="mt-4">
              <Link
                href="/pharmacy"
                className="inline-flex items-center h-9 px-3 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                {t('common.back')}
              </Link>
            </div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout
        title={medicine.name || t('pharmacy.medicine')}
        description={medicine.genericName || ''} dense>
        <div className="max-w-4xl">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <Link
              href="/pharmacy"
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span>{t('common.back')}</span>
            </Link>
            <Link
              href={`/pharmacy/medicines/${medicine._id}/edit`}
              className="inline-flex items-center gap-1.5 h-9 px-3 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Edit className="h-4 w-4 shrink-0" />
              <span>{t('common.edit')}</span>
            </Link>
          </div>

          {/* Alerts */}
          {(isLowStock() || isExpiringSoon(medicine.expiryDate)) && (
            <div className="mb-3 space-y-2">
              {isLowStock() && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-yellow-800">
                      {t('pharmacy.lowStock')}
                    </p>
                    <p className="text-xs text-yellow-700">
                      Current stock: {medicine.currentStock} {medicine.unit} (Reorder level: {medicine.reorderLevel})
                    </p>
                  </div>
                </div>
              )}
              {isExpiringSoon(medicine.expiryDate) && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-md flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-orange-800">
                      {t('pharmacy.expiringSoon')}
                    </p>
                    <p className="text-xs text-orange-700">
                      Expiry date: {formatDate(medicine.expiryDate)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-3">
              {/* Basic Information */}
              <div className="bg-white border border-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                    <Pill className="h-4 w-4 text-blue-600" />
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">{t('pharmacy.basicInfo')}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">{t('pharmacy.medicineName')}</label>
                    <p className="mt-1 text-sm font-medium text-gray-900">{medicine.name}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">{t('pharmacy.genericName')}</label>
                    <p className="mt-1 text-sm font-medium text-gray-900">{medicine.genericName}</p>
                  </div>
                  {medicine.brandName && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">{t('pharmacy.brandName')}</label>
                      <p className="mt-1 text-sm font-medium text-gray-900">{medicine.brandName}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">{t('pharmacy.category')}</label>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {t(`pharmacy.categories.${medicine.category}`) || medicine.category}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">{t('pharmacy.dosageForm')}</label>
                    <p className="mt-1 text-sm font-medium text-gray-900">{medicine.dosageForm}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">{t('pharmacy.strength')}</label>
                    <p className="mt-1 text-sm font-medium text-gray-900">{medicine.strength}</p>
                  </div>
                  {medicine.manufacturer && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">{t('pharmacy.manufacturer')}</label>
                      <p className="mt-1 text-sm font-medium text-gray-900">{medicine.manufacturer}</p>
                    </div>
                  )}
                  {medicine.supplierName && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">{t('pharmacy.supplier')}</label>
                      <p className="mt-1 text-sm font-medium text-gray-900">{medicine.supplierName}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Stock & Pricing */}
              <div className="bg-white border border-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                    <Package className="h-4 w-4 text-green-600" />
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">{t('pharmacy.stockPricing')}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">{t('pharmacy.currentStock')}</label>
                    <p className="mt-0.5 text-base font-semibold text-gray-900">
                      {medicine.currentStock} {medicine.unit}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">{t('pharmacy.reorderLevel')}</label>
                    <p className="mt-0.5 text-base font-semibold text-gray-900">
                      {medicine.reorderLevel} {medicine.unit}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">{t('pharmacy.unitCost')}</label>
                    <p className="mt-0.5 text-base font-semibold text-gray-900">
                      {formatCurrency(Number(medicine.unitCost) || 0)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">{t('pharmacy.sellingPrice')}</label>
                    <p className="mt-0.5 text-base font-semibold text-blue-600">
                      {formatCurrency(Number(medicine.sellingPrice) || 0)}
                    </p>
                  </div>
                  {medicine.shelfLocation && (
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-gray-500 uppercase">{t('pharmacy.shelfLocation')}</label>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <p className="text-sm font-medium text-gray-900">{medicine.shelfLocation}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Batch & Expiry */}
              <div className="bg-white border border-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                    <Calendar className="h-4 w-4 text-purple-600" />
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">{t('pharmacy.batchExpiry')}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {medicine.batchNumber && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">{t('pharmacy.batchNumber')}</label>
                      <p className="mt-1 text-sm font-medium text-gray-900">{medicine.batchNumber}</p>
                    </div>
                  )}
                  {medicine.manufacturingDate && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">{t('pharmacy.manufacturingDate')}</label>
                      <p className="mt-1 text-sm font-medium text-gray-900">{formatDate(medicine.manufacturingDate)}</p>
                    </div>
                  )}
                  {medicine.expiryDate && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">{t('pharmacy.expiryDate')}</label>
                      <p className={`mt-1 text-sm font-medium ${isExpiringSoon(medicine.expiryDate) ? 'text-orange-600' : 'text-gray-900'}`}>
                        {formatDate(medicine.expiryDate)}
                      </p>
                    </div>
                  )}
                  {medicine.barcode && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">{t('pharmacy.barcode')}</label>
                      <p className="mt-1 text-sm font-medium text-gray-900 font-mono">{medicine.barcode}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              {(medicine.description || medicine.composition || medicine.storageConditions) && (
                <div className="bg-white border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-gray-600" />
                    </div>
                    <h2 className="text-base font-semibold text-gray-900">{t('pharmacy.additionalInfo')}</h2>
                  </div>
                  <div className="space-y-3">
                    {medicine.description && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">{t('pharmacy.description')}</label>
                        <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{medicine.description}</p>
                      </div>
                    )}
                    {medicine.composition && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">{t('pharmacy.composition')}</label>
                        <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{medicine.composition}</p>
                      </div>
                    )}
                    {medicine.storageConditions && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">{t('pharmacy.storageConditions')}</label>
                        <p className="mt-1 text-sm text-gray-700">{medicine.storageConditions}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-3">
              {/* Status Card */}
              <div className="bg-white border border-gray-100 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('common.status')}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{t('pharmacy.stock')}</span>
                    <span className={`font-medium ${isLowStock() ? 'text-yellow-600' : 'text-green-600'}`}>
                      {isLowStock() ? t('pharmacy.lowStock') : t('common.active')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{t('pharmacy.prescriptionRequired')}</span>
                    <span className="font-medium text-gray-900">
                      {medicine.prescriptionRequired ? t('common.yes') : t('common.no')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{t('common.active')}</span>
                    <span className={`font-medium ${medicine.isActive ? 'text-green-600' : 'text-red-600'}`}>
                      {medicine.isActive ? t('common.yes') : t('common.no')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stock Value Card */}
              <div className="bg-white border border-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-green-600 shrink-0" />
                  <h3 className="text-sm font-semibold text-gray-900">{t('pharmacy.stockValue')}</h3>
                </div>
                <p className="text-xl font-bold text-green-600 tabular-nums">
                  {formatCurrency((medicine.currentStock || 0) * (medicine.unitCost || 0))}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {medicine.currentStock} {medicine.unit} × {formatCurrency(Number(medicine.unitCost) || 0)}
                </p>
              </div>

              {/* SKU */}
              {medicine.sku && (
                <div className="bg-white border border-gray-100 rounded-lg p-4">
                  <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">SKU</h3>
                  <p className="text-base font-mono font-semibold text-gray-900">{medicine.sku}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}

export default function MedicineViewPage({ params }: { params: Promise<{ id: string }> }) {
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
      <MedicineViewContent params={params} />
    </Suspense>
  );
}
