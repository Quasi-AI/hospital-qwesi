'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../../protected-route';
import SidebarLayout from '../../../components/sidebar-layout';
import { useTranslations } from '../../../hooks/useTranslations';
import { Droplets, ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function NewBloodUnitPage() {
  const { t, translationsLoaded } = useTranslations();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bloodGroup: '',
    component: 'whole-blood',
    bagNumber: '',
    volume: 450,
    storageLocation: 'Main Blood Bank',
    donorName: '',
    collectionDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.bloodGroup || !formData.bagNumber) {
      toast.error(t('bloodBank.requiredFields') || 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/blood-bank/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add blood unit');
      }

      toast.success(t('bloodBank.unitAdded') || 'Blood unit added successfully');
      router.push('/blood-bank/inventory');
    } catch (error: any) {
      console.error('Error adding blood unit:', error);
      toast.error(error.message || t('bloodBank.addError') || 'Failed to add blood unit');
    } finally {
      setLoading(false);
    }
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('bloodBank.addUnit') || 'Add Blood Unit'} dense>
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
        title={t('bloodBank.addUnit') || 'Add Blood Unit'} 
        description={t('bloodBank.addUnitDescription') || 'Add a new blood unit to inventory'} dense>
        <div className="max-w-2xl mx-auto">
          <Link
            href="/blood-bank/inventory"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            {t('common.back') || 'Back to Inventory'}
          </Link>

          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-md bg-red-100 p-2">
                <Droplets className="h-5 w-5 text-red-600" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">
                {t('bloodBank.newBloodUnit') || 'New Blood Unit'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                    {t('bloodBank.component') || 'Component'} *
                  </label>
                  <select
                    value={formData.component}
                    onChange={(e) => setFormData(prev => ({ ...prev, component: e.target.value }))}
                    required
                    className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    <option value="whole-blood">Whole Blood</option>
                    <option value="packed-rbc">Packed RBC</option>
                    <option value="platelets">Platelets</option>
                    <option value="plasma">Plasma</option>
                    <option value="cryoprecipitate">Cryoprecipitate</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('bloodBank.bagNumber') || 'Bag Number'} *
                  </label>
                  <input
                    type="text"
                    value={formData.bagNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, bagNumber: e.target.value }))}
                    required
                    placeholder="Enter bag number"
                    className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('bloodBank.volume') || 'Volume (mL)'}
                  </label>
                  <input
                    type="number"
                    value={formData.volume}
                    onChange={(e) => setFormData(prev => ({ ...prev, volume: parseInt(e.target.value) }))}
                    min="100"
                    max="1000"
                    className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('bloodBank.collectionDate') || 'Collection Date'} *
                  </label>
                  <input
                    type="date"
                    value={formData.collectionDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, collectionDate: e.target.value }))}
                    required
                    max={new Date().toISOString().split('T')[0]}
                    className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('bloodBank.storageLocation') || 'Storage Location'} *
                  </label>
                  <input
                    type="text"
                    value={formData.storageLocation}
                    onChange={(e) => setFormData(prev => ({ ...prev, storageLocation: e.target.value }))}
                    required
                    placeholder="e.g., Main Blood Bank, Refrigerator A"
                    className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('bloodBank.donorName') || 'Donor Name'} (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.donorName}
                    onChange={(e) => setFormData(prev => ({ ...prev, donorName: e.target.value }))}
                    placeholder="Enter donor name if known"
                    className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('bloodBank.notes') || 'Notes'}
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    placeholder="Any additional notes"
                    className="w-full rounded-md border border-gray-200 px-2.5 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="rounded-md border border-yellow-200 bg-yellow-50/80 p-3">
                <p className="text-xs text-yellow-800">
                  <strong>{t('bloodBank.note') || 'Note'}:</strong> {t('bloodBank.quarantineNote') || 'The blood unit will be placed in quarantine until all mandatory tests are completed and cleared.'}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Link
                  href="/blood-bank/inventory"
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
                  {t('common.save') || 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
