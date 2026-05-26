'use client';

import { useState, useEffect, use, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations } from '@/app/hooks/useTranslations';
import { ArrowLeft, Save, Pill } from 'lucide-react';

interface Supplier { _id: string; name: string; }

function EditMedicineForm({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { t, translationsLoaded } = useTranslations();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [formData, setFormData] = useState({
    name: '', genericName: '', brandName: '', category: 'tablet', dosageForm: '', strength: '', unit: 'units',
    manufacturer: '', batchNumber: '', barcode: '', description: '', composition: '', sideEffects: '',
    contraindications: '', storageConditions: '', prescriptionRequired: true,
    currentStock: 0, reorderLevel: 10, maxStock: 1000, unitCost: 0, sellingPrice: 0,
    expiryDate: '', manufacturingDate: '', shelfLocation: '', supplierId: '', supplierName: '',
  });

  useEffect(() => {
    fetchSuppliers();
    fetchMedicine();
  }, [resolvedParams.id]);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/inventory/suppliers?isActive=true');
      if (response.ok) setSuppliers(await response.json());
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchMedicine = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/pharmacy/medicines/${resolvedParams.id}`);
      if (response.ok) {
        const medicine = await response.json();
        
        // Format dates
        const formatDate = (date: string | Date | null) => {
          if (!date) return '';
          const d = new Date(date);
          return d.toISOString().split('T')[0];
        };

        setFormData({
          name: medicine.name || '',
          genericName: medicine.genericName || '',
          brandName: medicine.brandName || '',
          category: medicine.category || 'tablet',
          dosageForm: medicine.dosageForm || '',
          strength: medicine.strength || '',
          unit: medicine.unit || 'units',
          manufacturer: medicine.manufacturer || '',
          batchNumber: medicine.batchNumber || '',
          barcode: medicine.barcode || '',
          description: medicine.description || '',
          composition: medicine.composition || '',
          sideEffects: medicine.sideEffects || '',
          contraindications: medicine.contraindications || '',
          storageConditions: medicine.storageConditions || '',
          prescriptionRequired: medicine.prescriptionRequired !== undefined ? medicine.prescriptionRequired : true,
          currentStock: medicine.currentStock || 0,
          reorderLevel: medicine.reorderLevel || 10,
          maxStock: medicine.maxStock || 1000,
          unitCost: medicine.unitCost || 0,
          sellingPrice: medicine.sellingPrice || 0,
          expiryDate: formatDate(medicine.expiryDate),
          manufacturingDate: formatDate(medicine.manufacturingDate),
          shelfLocation: medicine.shelfLocation || '',
          supplierId: medicine.supplierId || '',
          supplierName: medicine.supplierName || '',
        });
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

  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const supplierId = e.target.value;
    const supplier = suppliers.find(s => s._id === supplierId);
    setFormData(prev => ({ ...prev, supplierId, supplierName: supplier?.name || '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/pharmacy/medicines/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          currentStock: Number(formData.currentStock),
          reorderLevel: Number(formData.reorderLevel),
          maxStock: Number(formData.maxStock),
          unitCost: Number(formData.unitCost),
          sellingPrice: Number(formData.sellingPrice),
          expiryDate: formData.expiryDate || undefined,
          manufacturingDate: formData.manufacturingDate || undefined,
        }),
      });
      if (response.ok) {
        router.push('/pharmacy');
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

  const categories = ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'ointment', 'drops', 'inhaler', 'powder', 'solution', 'suspension', 'other'];

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('pharmacy.editMedicine')} description="" dense>
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
        <SidebarLayout title={t('pharmacy.editMedicine')} description="" dense>
          <div className="flex items-center justify-center h-48 gap-2">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600 shrink-0"></div>
            <span className="text-sm text-gray-600">Loading medicine data...</span>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout
        title={t('pharmacy.editMedicine')}
        description={t('pharmacy.editMedicineDescription')} dense>
        <div className="max-w-4xl">
          <Link
            href="/pharmacy"
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
                <Pill className="h-4 w-4 text-blue-600 shrink-0" />
                {t('pharmacy.basicInfo')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('pharmacy.medicineName')} *
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
                    {t('pharmacy.genericName')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.genericName}
                    onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('pharmacy.brandName')}
                  </label>
                  <input
                    type="text"
                    value={formData.brandName}
                    onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('pharmacy.category')} *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {t(`pharmacy.categories.${cat}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('pharmacy.dosageForm')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.dosageForm}
                    onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 10mg, 500mg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('pharmacy.strength')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.strength}
                    onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 500mg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('pharmacy.manufacturer')}
                  </label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('pharmacy.supplier')}
                  </label>
                  <select
                    value={formData.supplierId}
                    onChange={handleSupplierChange}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t('pharmacy.selectSupplier')}</option>
                    {suppliers.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Stock & Pricing */}
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3">{t('pharmacy.stockPricing')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('pharmacy.currentStock')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: Number(e.target.value) })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('pharmacy.reorderLevel')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: Number(e.target.value) })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('pharmacy.unit')}
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('pharmacy.unitCost')} *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: Number(e.target.value) })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('pharmacy.sellingPrice')} *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('pharmacy.shelfLocation')}
                  </label>
                  <input
                    type="text"
                    value={formData.shelfLocation}
                    onChange={(e) => setFormData({ ...formData, shelfLocation: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., A-1-3"
                  />
                </div>
              </div>
            </div>

            {/* Batch & Expiry */}
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3">{t('pharmacy.batchExpiry')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('pharmacy.batchNumber')}
                  </label>
                  <input
                    type="text"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('pharmacy.manufacturingDate')}
                  </label>
                  <input
                    type="date"
                    value={formData.manufacturingDate}
                    onChange={(e) => setFormData({ ...formData, manufacturingDate: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('pharmacy.expiryDate')}
                  </label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('pharmacy.barcode')}
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2 pt-4 md:col-span-2">
                  <input
                    type="checkbox"
                    id="prescriptionRequired"
                    checked={formData.prescriptionRequired}
                    onChange={(e) => setFormData({ ...formData, prescriptionRequired: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded shrink-0"
                  />
                  <label htmlFor="prescriptionRequired" className="text-xs text-gray-700">
                    {t('pharmacy.prescriptionRequired')}
                  </label>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3">{t('pharmacy.additionalInfo')}</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('pharmacy.description')}
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full min-h-[4.5rem] px-2.5 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('pharmacy.composition')}
                  </label>
                  <textarea
                    rows={2}
                    value={formData.composition}
                    onChange={(e) => setFormData({ ...formData, composition: e.target.value })}
                    className="w-full min-h-[4.5rem] px-2.5 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('pharmacy.storageConditions')}
                  </label>
                  <input
                    type="text"
                    value={formData.storageConditions}
                    onChange={(e) => setFormData({ ...formData, storageConditions: e.target.value })}
                    className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Store below 25°C"
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
                href="/pharmacy"
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

export default function EditMedicinePage({ params }: { params: Promise<{ id: string }> }) {
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
      <EditMedicineForm params={params} />
    </Suspense>
  );
}
