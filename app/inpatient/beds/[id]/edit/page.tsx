'use client';

import { useState, useEffect, use, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations } from '@/app/hooks/useTranslations';
import { ArrowLeft, Save } from 'lucide-react';

interface Ward {
  _id: string;
  wardNumber: string;
  name: string;
  type: string;
  dailyRate: number;
}

function EditBedForm({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { t, translationsLoaded } = useTranslations();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [wards, setWards] = useState<Ward[]>([]);

  const [formData, setFormData] = useState({
    bedNumber: '',
    wardId: '',
    type: 'standard',
    status: 'available',
    features: [] as string[],
    dailyRate: 0,
    position: '',
    notes: '',
    isActive: true,
  });

  const [newFeature, setNewFeature] = useState('');

  useEffect(() => {
    fetchWards();
    fetchBed();
  }, [resolvedParams.id]);

  const fetchWards = async () => {
    try {
      const response = await fetch('/api/inpatient/wards?isActive=true');
      if (response.ok) {
        const data = await response.json();
        setWards(data);
      }
    } catch (error) {
      console.error('Error fetching wards:', error);
    }
  };

  const fetchBed = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/inpatient/beds/${resolvedParams.id}`);
      if (response.ok) {
        const bed = await response.json();
        setFormData({
          bedNumber: bed.bedNumber || '',
          wardId: bed.wardId || '',
          type: bed.type || 'standard',
          status: bed.status || 'available',
          features: bed.features || [],
          dailyRate: bed.dailyRate || 0,
          position: bed.position || '',
          notes: bed.notes || '',
          isActive: bed.isActive !== undefined ? bed.isActive : true,
        });
      } else {
        setError('Bed not found');
      }
    } catch (err) {
      console.error('Error fetching bed:', err);
      setError('Failed to load bed data');
    } finally {
      setLoading(false);
    }
  };

  const handleWardChange = (wardId: string) => {
    const ward = wards.find(w => w._id === wardId);
    setFormData({
      ...formData,
      wardId,
      dailyRate: ward?.dailyRate || formData.dailyRate
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/inpatient/beds/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push('/inpatient/beds');
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

  const addFeature = () => {
    if (newFeature.trim() && !formData.features.includes(newFeature.trim())) {
      setFormData({
        ...formData,
        features: [...formData.features, newFeature.trim()]
      });
      setNewFeature('');
    }
  };

  const removeFeature = (feature: string) => {
    setFormData({
      ...formData,
      features: formData.features.filter(f => f !== feature)
    });
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('inpatient.editBed')} description="" dense>
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
        <SidebarLayout title={t('inpatient.editBed')} description="" dense>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-sm text-gray-600">Loading bed data...</span>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout
        title={t('inpatient.editBed')}
        description={t('inpatient.editBedDescription')} dense>
        <div className="max-w-3xl">
          <Link
            href="/inpatient/beds"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t('common.back')}</span>
          </Link>

          {error && (
            <div className="mb-4 p-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bed Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('inpatient.bedNumber')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.bedNumber}
                  onChange={(e) => setFormData({ ...formData, bedNumber: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., B-001"
                />
              </div>

              {/* Ward Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('inpatient.ward')} *
                </label>
                <select
                  required
                  value={formData.wardId}
                  onChange={(e) => handleWardChange(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('inpatient.selectWard')}</option>
                  {wards.map((ward) => (
                    <option key={ward._id} value={ward._id}>
                      {ward.name} ({ward.wardNumber})
                    </option>
                  ))}
                </select>
              </div>

              {/* Bed Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('inpatient.bedType')} *
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="standard">{t('inpatient.bedTypes.standard')}</option>
                  <option value="electric">{t('inpatient.bedTypes.electric')}</option>
                  <option value="icu">{t('inpatient.bedTypes.icu')}</option>
                  <option value="pediatric">{t('inpatient.bedTypes.pediatric')}</option>
                  <option value="bariatric">{t('inpatient.bedTypes.bariatric')}</option>
                  <option value="stretcher">{t('inpatient.bedTypes.stretcher')}</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('inpatient.status')} *
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="available">{t('inpatient.bedStatus.available')}</option>
                  <option value="occupied">{t('inpatient.bedStatus.occupied')}</option>
                  <option value="reserved">{t('inpatient.bedStatus.reserved')}</option>
                  <option value="maintenance">{t('inpatient.bedStatus.maintenance')}</option>
                  <option value="cleaning">{t('inpatient.bedStatus.cleaning')}</option>
                </select>
              </div>

              {/* Daily Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('inpatient.dailyRate')} *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.dailyRate}
                  onChange={(e) => setFormData({ ...formData, dailyRate: parseFloat(e.target.value) || 0 })}
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('inpatient.position')}
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Window, Aisle"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('inpatient.notes')}
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full min-h-[3.5rem] px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Features */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('inpatient.features')}
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                  className="flex-1 h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('inpatient.featurePlaceholder')}
                />
                <button
                  type="button"
                  onClick={addFeature}
                  className="h-9 px-3 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  {t('common.add')}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {formData.features.map((feature, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs"
                  >
                    {feature}
                    <button
                      type="button"
                      onClick={() => removeFeature(feature)}
                      className="hover:text-blue-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                {t('inpatient.bedActive')}
              </label>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? t('common.saving') : t('common.save')}</span>
              </button>
              <Link
                href="/inpatient/beds"
                className="inline-flex items-center h-9 px-4 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
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

export default function EditBedPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={
      <ProtectedRoute>
        <SidebarLayout title="" description="" dense>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    }>
      <EditBedForm params={params} />
    </Suspense>
  );
}
