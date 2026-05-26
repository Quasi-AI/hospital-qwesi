'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations } from '@/app/hooks/useTranslations';
import { ArrowLeft, Save, FileText, AlertTriangle } from 'lucide-react';

interface RadiologyStudy {
  _id: string; studyNumber: string; patientName: string; studyType: string; bodyPart: string;
  studyDescription: string; findings?: string; impression?: string; recommendations?: string;
  comparisonNotes?: string; isCritical: boolean; criticalFindings?: string;
}

export default function RadiologyReportPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { t, translationsLoaded } = useTranslations();
  const [study, setStudy] = useState<RadiologyStudy | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    findings: '', impression: '', recommendations: '', comparisonNotes: '',
    isCritical: false, criticalFindings: '',
  });

  useEffect(() => { fetchStudy(); }, [resolvedParams.id]);

  const fetchStudy = async () => {
    try {
      const response = await fetch(`/api/radiology/${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        setStudy(data);
        setFormData({
          findings: data.findings || '', impression: data.impression || '',
          recommendations: data.recommendations || '', comparisonNotes: data.comparisonNotes || '',
          isCritical: data.isCritical || false, criticalFindings: data.criticalFindings || '',
        });
      }
    } catch (error) { console.error('Error fetching study:', error); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.findings.trim()) { setError(t('radiology.findingsRequired')); return; }
    setSubmitting(true); setError('');

    try {
      const response = await fetch(`/api/radiology/${resolvedParams.id}/report`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData),
      });
      if (response.ok) router.push(`/radiology/${resolvedParams.id}`);
      else { const data = await response.json(); setError(data.error || t('common.error')); }
    } catch { setError(t('common.error')); }
    finally { setSubmitting(false); }
  };

  const getStudyTypeLabel = (type: string) => {
    const labels: Record<string, string> = { 'x-ray': 'X-Ray', 'ct-scan': 'CT Scan', 'mri': 'MRI', 'ultrasound': 'Ultrasound', 'mammography': 'Mammography', 'other': 'Other' };
    return labels[type] || type;
  };

  if (!translationsLoaded || loading) {
    return <ProtectedRoute><SidebarLayout title="" description="" dense><div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div></div></SidebarLayout></ProtectedRoute>;
  }

  if (!study) {
    return <ProtectedRoute><SidebarLayout title="" description="" dense><div className="text-center py-8"><p className="text-sm text-gray-500">{t('radiology.studyNotFound')}</p><Link href="/radiology" className="text-sm text-blue-600 hover:underline">{t('common.back')}</Link></div></SidebarLayout></ProtectedRoute>;
  }

  return (
    <ProtectedRoute>
      <SidebarLayout title={t('radiology.addReport')} description={study.studyNumber} dense>
        <div className="max-w-4xl">
          <Link href={`/radiology/${study._id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="h-4 w-4" /><span>{t('common.back')}</span>
          </Link>

          {/* Study Info */}
          <div className="bg-white rounded-lg border border-gray-100 p-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0"><FileText className="h-5 w-5 text-blue-600" /></div>
              <div className="min-w-0">
                <h3 className="font-semibold text-base">{study.patientName}</h3>
                <p className="text-gray-500 text-xs">{study.studyNumber} • {getStudyTypeLabel(study.studyType)} - {study.bodyPart}</p>
                <p className="text-gray-500 text-xs truncate">{study.studyDescription}</p>
              </div>
            </div>
          </div>

          {error && <div className="mb-3 p-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded-md">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Findings */}
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
              <h3 className="text-base font-semibold mb-3">{t('radiology.reportDetails')}</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">{t('radiology.findings')} *</label>
                  <textarea rows={5} required value={formData.findings} onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('radiology.findingsPlaceholder')} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">{t('radiology.impression')}</label>
                  <textarea rows={3} value={formData.impression} onChange={(e) => setFormData({ ...formData, impression: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('radiology.impressionPlaceholder')} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">{t('radiology.recommendations')}</label>
                  <textarea rows={2} value={formData.recommendations} onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('radiology.recommendationsPlaceholder')} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">{t('radiology.comparisonNotes')}</label>
                  <textarea rows={2} value={formData.comparisonNotes} onChange={(e) => setFormData({ ...formData, comparisonNotes: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('radiology.comparisonNotesPlaceholder')} />
                </div>
              </div>
            </div>

            {/* Critical Findings */}
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
              <h3 className="text-base font-semibold mb-3 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />{t('radiology.criticalFindings')}</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isCritical" checked={formData.isCritical} onChange={(e) => setFormData({ ...formData, isCritical: e.target.checked })}
                    className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500" />
                  <label htmlFor="isCritical" className="text-sm font-medium text-gray-700">{t('radiology.markAsCritical')}</label>
                </div>
                {formData.isCritical && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">{t('radiology.criticalFindingsDescription')}</label>
                    <textarea rows={2} value={formData.criticalFindings} onChange={(e) => setFormData({ ...formData, criticalFindings: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-red-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-red-50"
                      placeholder={t('radiology.criticalFindingsPlaceholder')} />
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-2">
              <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50">
                <Save className="h-4 w-4" /><span>{submitting ? t('common.saving') : t('radiology.submitReport')}</span>
              </button>
              <Link href={`/radiology/${study._id}`} className="inline-flex items-center h-9 px-4 text-sm border border-gray-300 rounded-md hover:bg-gray-50">{t('common.cancel')}</Link>
            </div>
          </form>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
