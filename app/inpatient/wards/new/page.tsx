'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations } from '@/app/hooks/useTranslations';
import { ArrowLeft, Save } from 'lucide-react';

export default function NewWardPage() {
  const router = useRouter();
  const { t, translationsLoaded } = useTranslations();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    type: 'general',
    floor: 1,
    building: '',
    totalBeds: 0,
    dailyRate: 0,
    amenities: [] as string[],
    description: '',
    isActive: true,
    inchargeName: '',
    contactNumber: '',
  });

  const [newAmenity, setNewAmenity] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/inpatient/wards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push('/inpatient/wards');
      } else {
        const data = await response.json();
        setError(data.error || t('common.error'));
      }
    } catch (err) {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const addAmenity = () => {
    if (newAmenity.trim() && !formData.amenities.includes(newAmenity.trim())) {
      setFormData({
        ...formData,
        amenities: [...formData.amenities, newAmenity.trim()]
      });
      setNewAmenity('');
    }
  };

  const removeAmenity = (amenity: string) => {
    setFormData({
      ...formData,
      amenities: formData.amenities.filter(a => a !== amenity)
    });
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('inpatient.addWard')} description="" dense>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout
        title={t('inpatient.addWard')}
        description={t('inpatient.addWardDescription')} dense>
        <div className="max-w-3xl">
          <Link
            href="/inpatient/wards"
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
              {/* Ward Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('inpatient.wardName')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('inpatient.wardNamePlaceholder')}
                />
              </div>

              {/* Ward Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('inpatient.wardType')} *
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="general">{t('inpatient.wardTypes.general')}</option>
                  <option value="private">{t('inpatient.wardTypes.private')}</option>
                  <option value="semi-private">{t('inpatient.wardTypes.semi-private')}</option>
                  <option value="icu">{t('inpatient.wardTypes.icu')}</option>
                  <option value="nicu">{t('inpatient.wardTypes.nicu')}</option>
                  <option value="picu">{t('inpatient.wardTypes.picu')}</option>
                  <option value="ccu">{t('inpatient.wardTypes.ccu')}</option>
                  <option value="emergency">{t('inpatient.wardTypes.emergency')}</option>
                  <option value="maternity">{t('inpatient.wardTypes.maternity')}</option>
                  <option value="pediatric">{t('inpatient.wardTypes.pediatric')}</option>
                  <option value="surgical">{t('inpatient.wardTypes.surgical')}</option>
                  <option value="orthopedic">{t('inpatient.wardTypes.orthopedic')}</option>
                </select>
              </div>

              {/* Floor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('inpatient.floor')} *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) })}
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Building */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('inpatient.building')}
                </label>
                <input
                  type="text"
                  value={formData.building}
                  onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('inpatient.buildingPlaceholder')}
                />
              </div>

              {/* Total Beds */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('inpatient.totalBeds')} *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.totalBeds}
                  onChange={(e) => setFormData({ ...formData, totalBeds: parseInt(e.target.value) })}
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
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
                  onChange={(e) => setFormData({ ...formData, dailyRate: parseFloat(e.target.value) })}
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Incharge Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('inpatient.incharge')}
                </label>
                <input
                  type="text"
                  value={formData.inchargeName}
                  onChange={(e) => setFormData({ ...formData, inchargeName: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('inpatient.inchargePlaceholder')}
                />
              </div>

              {/* Contact Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('inpatient.contactNumber')}
                </label>
                <input
                  type="tel"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('inpatient.description')}
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full min-h-[4.5rem] px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('inpatient.descriptionPlaceholder')}
              />
            </div>

            {/* Amenities */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('inpatient.amenities')}
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newAmenity}
                  onChange={(e) => setNewAmenity(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
                  className="flex-1 h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={addAmenity}
                  className="h-9 px-3 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  {t('common.add')}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.amenities.map((amenity, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs"
                  >
                    {amenity}
                    <button
                      type="button"
                      onClick={() => removeAmenity(amenity)}
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
                {t('inpatient.wardActive')}
              </label>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                <span>{loading ? t('common.saving') : t('common.save')}</span>
              </button>
              <Link
                href="/inpatient/wards"
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
