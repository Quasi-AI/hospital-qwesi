'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../../protected-route';
import SidebarLayout from '../../../components/sidebar-layout';
import { useTranslations } from '../../../hooks/useTranslations';
import { Users, ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function NewDonorPage() {
  const { t, translationsLoaded } = useTranslations();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'male',
    bloodGroup: '',
    phone: '',
    email: '',
    weight: '',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
    },
    hasChronicDisease: false,
    hasTattoo: false,
    hasRecentSurgery: false,
    isOnMedication: false,
    hasAllergies: false,
    consentGiven: false,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.bloodGroup || !formData.phone || !formData.dateOfBirth) {
      toast.error(t('bloodBank.requiredFields') || 'Please fill in all required fields');
      return;
    }

    if (!formData.consentGiven) {
      toast.error(t('bloodBank.consentRequired') || 'Donor consent is required');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/blood-bank/donors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          weight: formData.weight ? parseFloat(formData.weight) : undefined,
          consentDate: new Date(),
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add donor');
      }

      toast.success(t('bloodBank.donorAdded') || 'Donor registered successfully');
      router.push('/blood-bank/donors');
    } catch (error: any) {
      console.error('Error adding donor:', error);
      toast.error(error.message || t('bloodBank.addError') || 'Failed to register donor');
    } finally {
      setLoading(false);
    }
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('bloodBank.addDonor') || 'Register Blood Donor'} dense>
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
        title={t('bloodBank.addDonor') || 'Register Blood Donor'} 
        description={t('bloodBank.addDonorDescription') || 'Register a new blood donor'} dense>
        <div className="max-w-3xl mx-auto">
          <Link
            href="/blood-bank/donors"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            {t('common.back') || 'Back to Donors'}
          </Link>

          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-md bg-red-100 p-2">
                <Users className="h-5 w-5 text-red-600" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">
                {t('bloodBank.newDonor') || 'New Blood Donor'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Personal Information */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">{t('bloodBank.personalInfo') || 'Personal Information'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      {t('bloodBank.firstName') || 'First Name'} *
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      required
                      className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      {t('bloodBank.lastName') || 'Last Name'} *
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      required
                      className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      {t('bloodBank.dateOfBirth') || 'Date of Birth'} *
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                      required
                      max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                      className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      {t('bloodBank.gender') || 'Gender'} *
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                      required
                      className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      {t('bloodBank.bloodGroup') || 'Blood Group'} *
                    </label>
                    <select
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData(prev => ({ ...prev, bloodGroup: e.target.value }))}
                      required
                      className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    >
                      <option value="">Select Blood Group</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(group => (
                        <option key={group} value={group}>{group}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      {t('bloodBank.weight') || 'Weight (kg)'} *
                    </label>
                    <input
                      type="number"
                      value={formData.weight}
                      onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                      required
                      min="50"
                      placeholder="Minimum 50 kg"
                      className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">{t('bloodBank.contactInfo') || 'Contact Information'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      {t('bloodBank.phone') || 'Phone'} *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      required
                      className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      {t('bloodBank.email') || 'Email'}
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      {t('bloodBank.address') || 'Address'}
                    </label>
                    <input
                      type="text"
                      value={formData.address.street}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, street: e.target.value } }))}
                      placeholder="Street address"
                      className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={formData.address.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, city: e.target.value } }))}
                      placeholder="City"
                      className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={formData.address.state}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, state: e.target.value } }))}
                      placeholder="State/Province"
                      className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Health Screening */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">{t('bloodBank.healthScreening') || 'Health Screening'}</h3>
                <div className="space-y-3">
                  {[
                    { key: 'hasChronicDisease', label: 'Has chronic disease (diabetes, heart disease, etc.)' },
                    { key: 'hasTattoo', label: 'Has tattoo within the last 6 months' },
                    { key: 'hasRecentSurgery', label: 'Has had surgery within the last 6 months' },
                    { key: 'isOnMedication', label: 'Currently on medication' },
                    { key: 'hasAllergies', label: 'Has allergies' },
                  ].map(item => (
                    <label key={item.key} className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData[item.key as keyof typeof formData] as boolean}
                        onChange={(e) => setFormData(prev => ({ ...prev, [item.key]: e.target.checked }))}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500 h-5 w-5"
                      />
                      <span className="text-sm text-gray-700">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Consent */}
              <div className="rounded-md border border-red-200 bg-red-50/80 p-3">
                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.consentGiven}
                    onChange={(e) => setFormData(prev => ({ ...prev, consentGiven: e.target.checked }))}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500 h-5 w-5 mt-0.5"
                  />
                  <span className="text-sm text-red-800">
                    <strong>{t('bloodBank.consentStatement') || 'Donor Consent'} *</strong>
                    <br />
                    I hereby consent to donate blood and confirm that all the information provided is true and accurate to the best of my knowledge. I understand that my blood will be tested for infectious diseases and used for transfusion purposes.
                  </span>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  {t('bloodBank.notes') || 'Additional Notes'}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full rounded-md border border-gray-200 px-2.5 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Link
                  href="/blood-bank/donors"
                  className="inline-flex h-9 items-center rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t('common.cancel') || 'Cancel'}
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-9 items-center rounded-md bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="h-5 w-5 mr-2" />
                  )}
                  {t('bloodBank.registerDonor') || 'Register Donor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
