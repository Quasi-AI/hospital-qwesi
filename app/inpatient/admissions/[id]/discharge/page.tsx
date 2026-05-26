'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations } from '@/app/hooks/useTranslations';
import { ArrowLeft, Save, LogOut } from 'lucide-react';

interface Admission { _id: string; admissionNumber: string; patientName: string; wardName: string; bedNumber: string; admissionDiagnosis?: string; status: string; }

export default function DischargePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { t, translationsLoaded } = useTranslations();
  const [admission, setAdmission] = useState<Admission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    dischargeType: 'normal',
    finalDiagnosis: '',
    dischargeSummary: '',
    dischargeInstructions: '',
    followUpDate: '',
    followUpInstructions: '',
    medicationsOnDischarge: [] as string[],
  });
  const [newMed, setNewMed] = useState('');

  useEffect(() => { fetchAdmission(); }, [resolvedParams.id]);

  const fetchAdmission = async () => {
    try { const res = await fetch(`/api/inpatient/admissions/${resolvedParams.id}`); if (res.ok) { const data = await res.json(); setAdmission(data); setFormData(f => ({ ...f, finalDiagnosis: data.admissionDiagnosis || '' })); } }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`/api/inpatient/admissions/${resolvedParams.id}/discharge`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData),
      });
      if (res.ok) router.push(`/inpatient/admissions/${resolvedParams.id}`);
      else { const data = await res.json(); setError(data.error || t('common.error')); }
    } catch { setError(t('common.error')); }
    finally { setSubmitting(false); }
  };

  const addMed = () => { if (newMed.trim() && !formData.medicationsOnDischarge.includes(newMed.trim())) { setFormData({ ...formData, medicationsOnDischarge: [...formData.medicationsOnDischarge, newMed.trim()] }); setNewMed(''); } };
  const removeMed = (m: string) => setFormData({ ...formData, medicationsOnDischarge: formData.medicationsOnDischarge.filter(x => x !== m) });

  if (!translationsLoaded || loading) return <ProtectedRoute><SidebarLayout title="" description="" dense><div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div></div></SidebarLayout></ProtectedRoute>;
  if (!admission) return <ProtectedRoute><SidebarLayout title="" description="" dense><div className="text-center py-8"><p className="text-sm text-gray-500">{t('inpatient.admissionNotFound')}</p><Link href="/inpatient/admissions" className="text-sm text-blue-600 hover:underline">{t('common.back')}</Link></div></SidebarLayout></ProtectedRoute>;
  if (admission.status === 'discharged') { router.push(`/inpatient/admissions/${resolvedParams.id}`); return null; }

  return (
    <ProtectedRoute>
      <SidebarLayout title={t('inpatient.dischargePatient')} description={admission.patientName} dense>
        <div className="max-w-3xl">
          <Link href={`/inpatient/admissions/${resolvedParams.id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4"><ArrowLeft className="h-4 w-4" /><span>{t('common.back')}</span></Link>

          {/* Patient Info */}
          <div className="bg-white rounded-lg border border-gray-100 p-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0"><LogOut className="h-5 w-5 text-blue-600" /></div>
              <div className="min-w-0">
                <h3 className="font-semibold text-base">{admission.patientName}</h3>
                <p className="text-gray-500 text-xs">{admission.admissionNumber} • {admission.wardName} - {admission.bedNumber}</p>
              </div>
            </div>
          </div>

          {error && <div className="mb-3 p-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded-md">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="bg-white rounded-lg border border-gray-100 p-4">
              <h3 className="text-base font-semibold mb-3">{t('inpatient.dischargeDetails')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.dischargeType')} *</label>
                  <select required value={formData.dischargeType} onChange={(e) => setFormData({ ...formData, dischargeType: e.target.value })} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="normal">{t('inpatient.dischargeTypes.normal')}</option>
                    <option value="against-medical-advice">{t('inpatient.dischargeTypes.against-medical-advice')}</option>
                    <option value="transfer">{t('inpatient.dischargeTypes.transfer')}</option>
                    <option value="deceased">{t('inpatient.dischargeTypes.deceased')}</option>
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.followUpDate')}</label>
                  <input type="date" value={formData.followUpDate} onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <div className="mt-3"><label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.finalDiagnosis')}</label>
                <textarea rows={2} value={formData.finalDiagnosis} onChange={(e) => setFormData({ ...formData, finalDiagnosis: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="mt-3"><label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.dischargeSummary')}</label>
                <textarea rows={3} value={formData.dischargeSummary} onChange={(e) => setFormData({ ...formData, dischargeSummary: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder={t('inpatient.dischargeSummaryPlaceholder')} />
              </div>
              <div className="mt-3"><label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.dischargeInstructions')}</label>
                <textarea rows={2} value={formData.dischargeInstructions} onChange={(e) => setFormData({ ...formData, dischargeInstructions: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder={t('inpatient.dischargeInstructionsPlaceholder')} />
              </div>
              <div className="mt-3"><label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.followUpInstructions')}</label>
                <textarea rows={2} value={formData.followUpInstructions} onChange={(e) => setFormData({ ...formData, followUpInstructions: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>

            {/* Medications on Discharge */}
            <div className="bg-white rounded-lg border border-gray-100 p-4">
              <h3 className="text-base font-semibold mb-3">{t('inpatient.medicationsOnDischarge')}</h3>
              <div className="flex gap-2 mb-2">
                <input type="text" value={newMed} onChange={(e) => setNewMed(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMed())} className="flex-1 h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder={t('inpatient.medicationPlaceholder')} />
                <button type="button" onClick={addMed} className="h-9 px-3 text-sm bg-gray-100 rounded-md hover:bg-gray-200 shrink-0">{t('common.add')}</button>
              </div>
              <div className="flex flex-wrap gap-1.5">{formData.medicationsOnDischarge.map((m, i) => <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">{m}<button type="button" onClick={() => removeMed(m)}>×</button></span>)}</div>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-2">
              <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50">
                <Save className="h-4 w-4" /><span>{submitting ? t('common.saving') : t('inpatient.confirmDischarge')}</span>
              </button>
              <Link href={`/inpatient/admissions/${resolvedParams.id}`} className="inline-flex items-center h-9 px-4 text-sm border border-gray-300 rounded-md hover:bg-gray-50">{t('common.cancel')}</Link>
            </div>
          </form>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
