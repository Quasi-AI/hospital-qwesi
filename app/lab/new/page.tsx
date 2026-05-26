'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FlaskConical,
  Plus,
  X,
  Save
} from 'lucide-react';
import ProtectedRoute from '../../protected-route';
import SidebarLayout from '../../components/sidebar-layout';
import { useTranslations } from '../../hooks/useTranslations';
import SearchablePatientSelect from '../../components/SearchablePatientSelect';
import { useSession } from 'next-auth/react';

export default function NewLabTestPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      }
    >
      <NewLabTestPageContent />
    </Suspense>
  );
}

function NewLabTestPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams.get('patientId');
  const { data: session } = useSession();
  const { t, translationsLoaded } = useTranslations();
  const [loading, setLoading] = useState(false);
  const [testInput, setTestInput] = useState('');

  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [formData, setFormData] = useState({
    testType: '',
    testCategory: 'other',
    tests: [] as string[],
    sampleType: '',
    priority: 'routine',
    notes: '',
  });

  const handlePatientChange = (patient: any | null) => {
    setSelectedPatient(patient);
  };

  useEffect(() => {
    if (!patientIdFromUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/patients/${patientIdFromUrl}`);
        if (!res.ok || cancelled) return;
        const p = await res.json();
        if (cancelled) return;
        setSelectedPatient({
          _id: p._id,
          patientId: p.patientId || p._id,
          name: p.name,
          email: p.email || '',
          phone: p.phone || '',
        });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientIdFromUrl]);

  const handleAddTest = () => {
    if (testInput.trim() && !formData.tests.includes(testInput.trim())) {
      setFormData({
        ...formData,
        tests: [...formData.tests, testInput.trim()],
      });
      setTestInput('');
    }
  };

  const handleRemoveTest = (test: string) => {
    setFormData({
      ...formData,
      tests: formData.tests.filter((t) => t !== test),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTest();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient) {
      alert(t('lab.selectPatient'));
      return;
    }

    if (!formData.testType) {
      alert(t('lab.fillRequiredFields'));
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          patientId: selectedPatient._id,
          patientName: selectedPatient.name,
          patientEmail: selectedPatient.email || '',
          patientPhone: selectedPatient.phone || '',
          doctorId: session?.user?.id || '',
          doctorName: session?.user?.name || '',
        }),
      });

      if (response.ok) {
        router.push('/lab');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create lab test order');
      }
    } catch (error) {
      console.error('Error creating lab test:', error);
      alert('Failed to create lab test order');
    } finally {
      setLoading(false);
    }
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('lab.newTestOrder')} description="" dense>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('common.loading')}</p>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout
        title={t('lab.newTestOrder')}
        description={t('lab.createNewTestOrder')}
        dense
      >
        <div className="space-y-3">
          <Link
            href="/lab"
            className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
            <span>{t('common.back')} {t('lab.toLabTests')}</span>
          </Link>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-900 sm:text-base">
                {t('lab.patientInformation')}
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    {t('lab.patient')} *
                  </label>
                  <SearchablePatientSelect
                    value={selectedPatient?.name || ''}
                    onChange={handlePatientChange}
                    syncPatient={selectedPatient}
                    placeholder={t('lab.selectPatient')}
                    className="w-full"
                  />
                </div>
                {selectedPatient && (
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                        {t('lab.email')}
                      </label>
                      <input
                        type="email"
                        value={selectedPatient.email || ''}
                        readOnly
                        className="h-9 w-full rounded-md border border-gray-300 bg-gray-50 px-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                        {t('lab.phone')}
                      </label>
                      <input
                        type="text"
                        value={selectedPatient.phone || ''}
                        readOnly
                        className="h-9 w-full rounded-md border border-gray-300 bg-gray-50 px-2.5 text-sm"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-900 sm:text-base">
                {t('lab.testInformation')}
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    {t('lab.testType')} *
                  </label>
                  <input
                    type="text"
                    value={formData.testType}
                    onChange={(e) =>
                      setFormData({ ...formData, testType: e.target.value })
                    }
                    placeholder={t('lab.testTypePlaceholder')}
                    className="h-9 w-full rounded-md border border-gray-300 px-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    {t('lab.testCategory')}
                  </label>
                  <select
                    value={formData.testCategory}
                    onChange={(e) =>
                      setFormData({ ...formData, testCategory: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-gray-300 px-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="hematology">{t('lab.categoryLabels.hematology')}</option>
                    <option value="biochemistry">{t('lab.categoryLabels.biochemistry')}</option>
                    <option value="microbiology">{t('lab.categoryLabels.microbiology')}</option>
                    <option value="immunology">{t('lab.categoryLabels.immunology')}</option>
                    <option value="pathology">{t('lab.categoryLabels.pathology')}</option>
                    <option value="urinalysis">{t('lab.categoryLabels.urinalysis')}</option>
                    <option value="other">{t('lab.categoryLabels.other')}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    {t('lab.sampleType')}
                  </label>
                  <input
                    type="text"
                    value={formData.sampleType}
                    onChange={(e) =>
                      setFormData({ ...formData, sampleType: e.target.value })
                    }
                    placeholder={t('lab.sampleTypePlaceholder')}
                    className="h-9 w-full rounded-md border border-gray-300 px-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    {t('lab.priority')}
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-gray-300 px-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="routine">{t('lab.priorityLabels.routine')}</option>
                    <option value="urgent">{t('lab.priorityLabels.urgent')}</option>
                    <option value="stat">{t('lab.priorityLabels.stat')}</option>
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                  {t('lab.testsToPerform')}
                </label>
                <div className="mb-2 flex gap-2">
                  <input
                    type="text"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={t('lab.addTestPlaceholder')}
                    className="h-9 flex-1 rounded-md border border-gray-300 px-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTest}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 sm:w-10"
                  >
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
                {formData.tests.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {formData.tests.map((test, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 sm:gap-1 sm:px-2.5 sm:py-1 sm:text-sm"
                      >
                        {test}
                        <button
                          type="button"
                          onClick={() => handleRemoveTest(test)}
                          className="hover:text-blue-900"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                  {t('lab.notes')}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder={t('lab.notesPlaceholder')}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Link
                href="/lab"
                className="h-9 rounded-md border border-gray-300 px-3 text-sm leading-8 text-gray-700 hover:bg-gray-50"
              >
                {t('common.cancel')}
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{t('lab.createOrder')}</span>
              </button>
            </div>
          </form>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
