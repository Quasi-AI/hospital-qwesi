'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FlaskConical,
  Plus,
  Trash2,
  Save,
  AlertTriangle
} from 'lucide-react';
import ProtectedRoute from '../../../protected-route';
import SidebarLayout from '../../../components/sidebar-layout';
import { useTranslations } from '../../../hooks/useTranslations';

interface LabResult {
  testName: string;
  value: string;
  unit: string;
  normalRange: string;
  status: 'normal' | 'abnormal' | 'critical';
  notes?: string;
}

export default function EnterResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { t, translationsLoaded } = useTranslations();
  const [labTest, setLabTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<LabResult[]>([]);
  const [resultNotes, setResultNotes] = useState('');
  const [isCritical, setIsCritical] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchLabTest();
    }
  }, [params.id]);

  const fetchLabTest = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/lab/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setLabTest(data.labTest);

        // Initialize results from existing results or from tests array
        if (data.labTest.results && data.labTest.results.length > 0) {
          setResults(data.labTest.results);
          setResultNotes(data.labTest.resultNotes || '');
          setIsCritical(data.labTest.isCritical || false);
        } else if (data.labTest.tests && data.labTest.tests.length > 0) {
          // Pre-populate from tests array
          setResults(
            data.labTest.tests.map((testName: string) => ({
              testName,
              value: '',
              unit: '',
              normalRange: '',
              status: 'normal' as const,
              notes: '',
            }))
          );
        } else {
          // Start with one empty result
          setResults([
            {
              testName: '',
              value: '',
              unit: '',
              normalRange: '',
              status: 'normal',
              notes: '',
            },
          ]);
        }
      }
    } catch (error) {
      console.error('Error fetching lab test:', error);
    } finally {
      setLoading(false);
    }
  };

  const addResult = () => {
    setResults([
      ...results,
      {
        testName: '',
        value: '',
        unit: '',
        normalRange: '',
        status: 'normal',
        notes: '',
      },
    ]);
  };

  const removeResult = (index: number) => {
    setResults(results.filter((_, i) => i !== index));
  };

  const updateResult = (index: number, field: keyof LabResult, value: string) => {
    const newResults = [...results];
    (newResults[index] as any)[field] = value;

    // Auto-detect critical status
    if (field === 'status' && value === 'critical') {
      setIsCritical(true);
    }

    setResults(newResults);
  };

  const handleSubmit = async (e: React.FormEvent, markComplete: boolean = false) => {
    e.preventDefault();

    // Validate that all results have at least test name and value
    const validResults = results.filter((r) => r.testName && r.value);
    if (validResults.length === 0) {
      alert(t('lab.fillAllResults'));
      return;
    }

    try {
      setSaving(true);

      const updateData: any = {
        results: validResults,
        resultNotes,
        isCritical,
      };

      if (markComplete) {
        updateData.status = 'completed';
        updateData.completedAt = new Date();
      } else if (labTest.status === 'sample-collected') {
        updateData.status = 'in-progress';
      }

      const response = await fetch(`/api/lab/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        router.push(`/lab/${params.id}`);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save results');
      }
    } catch (error) {
      console.error('Error saving results:', error);
      alert('Failed to save results');
    } finally {
      setSaving(false);
    }
  };

  if (!translationsLoaded || loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('lab.enterResults')} description="" dense>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('common.loading')}</p>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (!labTest) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('lab.enterResults')} description="" dense>
          <div className="text-center py-12">
            <FlaskConical className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">{t('lab.testNotFound')}</p>
            <Link
              href="/lab"
              className="mt-4 inline-block text-blue-600 hover:text-blue-700"
            >
              {t('common.back')} {t('lab.toLabTests')}
            </Link>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout
        title={t('lab.enterResults')}
        description={labTest.testNumber} dense>
        <div className="space-y-6">
          {/* Back Link */}
          <Link
            href={`/lab/${params.id}`}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>{t('common.back')} {t('lab.toLabTests')}</span>
          </Link>

          {/* Test Info Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <FlaskConical className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{labTest.testType}</h3>
                <p className="text-sm text-gray-600">
                  {labTest.patientName} • {t(`lab.categoryLabels.${labTest.testCategory}`)}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
            {/* Results Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('lab.results')}
                </h3>
                <button
                  type="button"
                  onClick={addResult}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  {t('lab.addResult')}
                </button>
              </div>

              <div className="space-y-4">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        {t('lab.testName')} *
                      </label>
                      <input
                        type="text"
                        value={result.testName}
                        onChange={(e) => updateResult(index, 'testName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        {t('lab.value')} *
                      </label>
                      <input
                        type="text"
                        value={result.value}
                        onChange={(e) => updateResult(index, 'value', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        {t('lab.unit')}
                      </label>
                      <input
                        type="text"
                        value={result.unit}
                        onChange={(e) => updateResult(index, 'unit', e.target.value)}
                        placeholder="mg/dL"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        {t('lab.normalRange')}
                      </label>
                      <input
                        type="text"
                        value={result.normalRange}
                        onChange={(e) => updateResult(index, 'normalRange', e.target.value)}
                        placeholder="70-100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          {t('lab.status')}
                        </label>
                        <select
                          value={result.status}
                          onChange={(e) => updateResult(index, 'status', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            result.status === 'critical'
                              ? 'border-red-500 bg-red-50'
                              : result.status === 'abnormal'
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-300'
                          }`}
                        >
                          <option value="normal">{t('lab.resultStatusLabels.normal')}</option>
                          <option value="abnormal">{t('lab.resultStatusLabels.abnormal')}</option>
                          <option value="critical">{t('lab.resultStatusLabels.critical')}</option>
                        </select>
                      </div>
                      {results.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeResult(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Notes */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('lab.additionalNotes')}
              </h3>
              <textarea
                value={resultNotes}
                onChange={(e) => setResultNotes(e.target.value)}
                placeholder={t('lab.notesPlaceholder')}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />

              {/* Critical Alert */}
              <div className="mt-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isCritical}
                    onChange={(e) => setIsCritical(e.target.checked)}
                    className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    {t('lab.markCriticalAlert')}
                  </span>
                </label>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-4">
              <Link
                href={`/lab/${params.id}`}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                ) : (
                  <Save className="h-5 w-5" />
                )}
                <span>{t('lab.saveResults')}</span>
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Save className="h-5 w-5" />
                )}
                <span>{t('lab.markComplete')}</span>
              </button>
            </div>
          </form>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
