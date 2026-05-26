'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations } from '@/app/hooks/useTranslations';
import { ArrowLeft, User, Calendar, Heart, FileText, AlertCircle, CheckCircle, Printer, Edit, LogOut, Plus } from 'lucide-react';

interface VitalSign { timestamp: string; bloodPressure?: string; pulse?: number; temperature?: number; oxygenSaturation?: number; notes?: string; recordedBy?: string; }
interface NursingNote { timestamp: string; note: string; nurseName: string; category: string; }
interface Admission {
  _id: string; admissionNumber: string; patientId: string; patientName: string; patientEmail?: string; patientPhone?: string;
  wardId: string; wardName: string; bedId: string; bedNumber: string; admittingDoctorName: string;
  admissionType: string; admissionDate: string; chiefComplaint: string; admissionDiagnosis?: string;
  status: string; priority: string; vitalSigns: VitalSign[]; nursingNotes: NursingNote[]; allergies: string[];
  emergencyContact?: { name: string; relationship: string; phone: string };
  dischargeInfo?: { dischargeType: string; dischargeSummary?: string; dischargeInstructions?: string; followUpDate?: string; dischargedBy?: string; dischargedAt?: string };
  createdAt: string;
}

export default function AdmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { t, translationsLoaded } = useTranslations();
  const [admission, setAdmission] = useState<Admission | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVitalModal, setShowVitalModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [vitalForm, setVitalForm] = useState({ bloodPressure: '', pulse: '', temperature: '', oxygenSaturation: '', notes: '' });
  const [noteForm, setNoteForm] = useState({ note: '', category: 'routine' });

  useEffect(() => { fetchAdmission(); }, [resolvedParams.id]);

  const fetchAdmission = async () => {
    try { const res = await fetch(`/api/inpatient/admissions/${resolvedParams.id}`); if (res.ok) setAdmission(await res.json()); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleAddVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/inpatient/admissions/${resolvedParams.id}/vitals`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bloodPressure: vitalForm.bloodPressure || undefined, pulse: vitalForm.pulse ? parseInt(vitalForm.pulse) : undefined, temperature: vitalForm.temperature ? parseFloat(vitalForm.temperature) : undefined, oxygenSaturation: vitalForm.oxygenSaturation ? parseInt(vitalForm.oxygenSaturation) : undefined, notes: vitalForm.notes || undefined }),
    });
    if (res.ok) { setShowVitalModal(false); setVitalForm({ bloodPressure: '', pulse: '', temperature: '', oxygenSaturation: '', notes: '' }); fetchAdmission(); }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/inpatient/admissions/${resolvedParams.id}/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(noteForm) });
    if (res.ok) { setShowNoteModal(false); setNoteForm({ note: '', category: 'routine' }); fetchAdmission(); }
  };

  const getStatusColor = (s: string) => ({ 'admitted': 'bg-blue-100 text-blue-800', 'in-treatment': 'bg-purple-100 text-purple-800', 'ready-for-discharge': 'bg-green-100 text-green-800', 'discharged': 'bg-gray-100 text-gray-800' }[s] || 'bg-gray-100 text-gray-800');
  const getPriorityColor = (p: string) => ({ 'normal': 'bg-green-100 text-green-800', 'urgent': 'bg-orange-100 text-orange-800', 'critical': 'bg-red-100 text-red-800' }[p] || 'bg-gray-100 text-gray-800');
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const formatDateTime = (d: string) => new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (!translationsLoaded || loading) return <ProtectedRoute><SidebarLayout title="" description="" dense><div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div></div></SidebarLayout></ProtectedRoute>;
  if (!admission) return <ProtectedRoute><SidebarLayout title="" description="" dense><div className="text-center py-8"><p className="text-sm text-gray-500">{t('inpatient.admissionNotFound')}</p><Link href="/inpatient/admissions" className="text-sm text-blue-600 hover:underline">{t('common.back')}</Link></div></SidebarLayout></ProtectedRoute>;

  const isActive = !['discharged', 'transferred', 'deceased', 'lama'].includes(admission.status);

  return (
    <ProtectedRoute>
      <SidebarLayout title={admission.patientName} description={admission.admissionNumber} dense>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between no-print">
            <Link href="/inpatient/admissions" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 w-fit"><ArrowLeft className="h-4 w-4" /><span>{t('common.back')}</span></Link>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 h-9 px-3 text-sm border border-gray-300 rounded-md hover:bg-gray-50"><Printer className="h-4 w-4" /><span>{t('common.print')}</span></button>
              {isActive && (<>
                <Link href={`/inpatient/admissions/${admission._id}/edit`} className="inline-flex items-center gap-1.5 h-9 px-3 text-sm border border-gray-300 rounded-md hover:bg-gray-50"><Edit className="h-4 w-4" /><span>{t('common.edit')}</span></Link>
                <Link href={`/inpatient/admissions/${admission._id}/discharge`} className="inline-flex items-center gap-1.5 h-9 px-3 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"><LogOut className="h-4 w-4" /><span>{t('inpatient.discharge')}</span></Link>
              </>)}
            </div>
          </div>

          {/* Patient Overview */}
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 admission-document">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shrink-0"><User className="h-6 w-6 text-blue-600" /></div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold">{admission.patientName}</h2>
                  <p className="text-sm text-gray-500">{admission.admissionNumber}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(admission.status)}`}>{t(`inpatient.statusLabels.${admission.status}`)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(admission.priority)}`}>{t(`inpatient.priorityLabels.${admission.priority}`)}</span>
                  </div>
                </div>
              </div>
              <div className="sm:text-right shrink-0"><p className="text-xs text-gray-500">{t('inpatient.admissionDate')}</p><p className="text-sm font-medium">{formatDate(admission.admissionDate)}</p></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 border-t pt-4">
              <div><p className="text-xs text-gray-500">{t('inpatient.ward')}</p><p className="text-sm font-medium">{admission.wardName}</p></div>
              <div><p className="text-xs text-gray-500">{t('inpatient.bed')}</p><p className="text-sm font-medium">{admission.bedNumber}</p></div>
              <div><p className="text-xs text-gray-500">{t('inpatient.doctor')}</p><p className="text-sm font-medium">{admission.admittingDoctorName}</p></div>
              <div><p className="text-xs text-gray-500">{t('inpatient.admissionType')}</p><p className="text-sm font-medium capitalize">{t(`inpatient.admissionTypes.${admission.admissionType}`)}</p></div>
            </div>
            {admission.chiefComplaint && <div className="mt-4 pt-4 border-t"><p className="text-xs font-medium text-gray-700 mb-1">{t('inpatient.chiefComplaint')}</p><p className="text-sm">{admission.chiefComplaint}</p></div>}
            {admission.allergies?.length > 0 && <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-md"><p className="text-xs font-medium text-red-800 mb-1.5 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{t('inpatient.allergies')}</p><div className="flex flex-wrap gap-1">{admission.allergies.map((a, i) => <span key={i} className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs">{a}</span>)}</div></div>}
          </div>

          {/* Vital Signs */}
          {isActive && <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold flex items-center gap-1.5"><Heart className="h-4 w-4 text-red-500 shrink-0" />{t('inpatient.vitalSigns')}</h3>
              <button onClick={() => setShowVitalModal(true)} className="inline-flex items-center gap-1 h-8 px-2.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 no-print"><Plus className="h-3.5 w-3.5" />{t('inpatient.addVitals')}</button>
            </div>
            {admission.vitalSigns?.length > 0 ? (
              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inpatient.dateTime')}</th><th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inpatient.bp')}</th><th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inpatient.pulse')}</th><th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inpatient.temp')}</th><th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inpatient.spo2')}</th><th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('inpatient.recordedBy')}</th></tr></thead>
                <tbody className="divide-y divide-gray-200">{admission.vitalSigns.slice().reverse().slice(0, 10).map((v, i) => <tr key={i}><td className="px-3 py-1.5 text-sm">{formatDateTime(v.timestamp)}</td><td className="px-3 py-1.5">{v.bloodPressure || '-'}</td><td className="px-3 py-1.5">{v.pulse || '-'}</td><td className="px-3 py-1.5">{v.temperature ? `${v.temperature}°F` : '-'}</td><td className="px-3 py-1.5">{v.oxygenSaturation ? `${v.oxygenSaturation}%` : '-'}</td><td className="px-3 py-1.5">{v.recordedBy || '-'}</td></tr>)}</tbody>
              </table>
              </div>
            ) : <p className="text-sm text-gray-500 text-center py-3">{t('inpatient.noVitals')}</p>}
          </div>}

          {/* Nursing Notes */}
          {isActive && <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold flex items-center gap-1.5"><FileText className="h-4 w-4 text-blue-500 shrink-0" />{t('inpatient.nursingNotes')}</h3>
              <button onClick={() => setShowNoteModal(true)} className="inline-flex items-center gap-1 h-8 px-2.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 no-print"><Plus className="h-3.5 w-3.5" />{t('inpatient.addNote')}</button>
            </div>
            {admission.nursingNotes?.length > 0 ? (
              <div className="space-y-2">{admission.nursingNotes.slice().reverse().slice(0, 10).map((n, i) => <div key={i} className="p-2.5 bg-gray-50 rounded-md"><div className="flex items-center justify-between mb-1"><span className="text-sm font-medium">{n.nurseName}</span><span className="text-xs text-gray-500">{formatDateTime(n.timestamp)}</span></div><p className="text-sm text-gray-700">{n.note}</p><span className="inline-block mt-1.5 px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-xs capitalize">{n.category}</span></div>)}</div>
            ) : <p className="text-sm text-gray-500 text-center py-3">{t('inpatient.noNotes')}</p>}
          </div>}

          {/* Emergency Contact */}
          {admission.emergencyContact?.name && <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
            <h3 className="text-base font-semibold mb-3">{t('inpatient.emergencyContact')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><p className="text-xs text-gray-500">{t('inpatient.contactName')}</p><p className="text-sm font-medium">{admission.emergencyContact.name}</p></div>
              <div><p className="text-xs text-gray-500">{t('inpatient.relationship')}</p><p className="text-sm font-medium">{admission.emergencyContact.relationship}</p></div>
              <div><p className="text-xs text-gray-500">{t('inpatient.contactPhone')}</p><p className="text-sm font-medium">{admission.emergencyContact.phone}</p></div>
            </div>
          </div>}

          {/* Discharge Info */}
          {admission.dischargeInfo && <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
            <h3 className="text-base font-semibold mb-3 flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-green-500 shrink-0" />{t('inpatient.dischargeInfo')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><p className="text-xs text-gray-500">{t('inpatient.dischargeType')}</p><p className="text-sm font-medium capitalize">{admission.dischargeInfo.dischargeType}</p></div>
              {admission.dischargeInfo.dischargedAt && <div><p className="text-xs text-gray-500">{t('inpatient.dischargedAt')}</p><p className="text-sm font-medium">{formatDateTime(admission.dischargeInfo.dischargedAt)}</p></div>}
              {admission.dischargeInfo.dischargedBy && <div><p className="text-xs text-gray-500">{t('inpatient.dischargedBy')}</p><p className="text-sm font-medium">{admission.dischargeInfo.dischargedBy}</p></div>}
              {admission.dischargeInfo.followUpDate && <div><p className="text-xs text-gray-500">{t('inpatient.followUpDate')}</p><p className="text-sm font-medium">{formatDate(admission.dischargeInfo.followUpDate)}</p></div>}
            </div>
            {admission.dischargeInfo.dischargeSummary && <div className="mt-3"><p className="text-xs text-gray-500 mb-0.5">{t('inpatient.dischargeSummary')}</p><p className="text-sm">{admission.dischargeInfo.dischargeSummary}</p></div>}
          </div>}
        </div>

        {/* Add Vitals Modal */}
        {showVitalModal && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-lg shadow-xl p-4 w-full max-w-md">
          <h3 className="text-base font-semibold mb-3">{t('inpatient.addVitals')}</h3>
          <form onSubmit={handleAddVitals} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.bloodPressure')}</label><input type="text" placeholder="120/80" value={vitalForm.bloodPressure} onChange={(e) => setVitalForm({ ...vitalForm, bloodPressure: e.target.value })} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.pulse')}</label><input type="number" placeholder="72" value={vitalForm.pulse} onChange={(e) => setVitalForm({ ...vitalForm, pulse: e.target.value })} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.temperature')}</label><input type="number" step="0.1" placeholder="98.6" value={vitalForm.temperature} onChange={(e) => setVitalForm({ ...vitalForm, temperature: e.target.value })} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.spo2')}</label><input type="number" placeholder="98" value={vitalForm.oxygenSaturation} onChange={(e) => setVitalForm({ ...vitalForm, oxygenSaturation: e.target.value })} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md" /></div>
            </div>
            <div><label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.notes')}</label><textarea rows={2} value={vitalForm.notes} onChange={(e) => setVitalForm({ ...vitalForm, notes: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md" /></div>
            <div className="flex gap-2 justify-end pt-1"><button type="button" onClick={() => setShowVitalModal(false)} className="h-9 px-3 text-sm border border-gray-300 rounded-md">{t('common.cancel')}</button><button type="submit" className="h-9 px-3 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">{t('common.save')}</button></div>
          </form>
        </div></div>}

        {/* Add Note Modal */}
        {showNoteModal && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-lg shadow-xl p-4 w-full max-w-md">
          <h3 className="text-base font-semibold mb-3">{t('inpatient.addNote')}</h3>
          <form onSubmit={handleAddNote} className="space-y-3">
            <div><label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.category')}</label><select value={noteForm.category} onChange={(e) => setNoteForm({ ...noteForm, category: e.target.value })} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md"><option value="routine">{t('inpatient.noteCategories.routine')}</option><option value="observation">{t('inpatient.noteCategories.observation')}</option><option value="medication">{t('inpatient.noteCategories.medication')}</option><option value="procedure">{t('inpatient.noteCategories.procedure')}</option><option value="incident">{t('inpatient.noteCategories.incident')}</option><option value="other">{t('inpatient.noteCategories.other')}</option></select></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.note')}</label><textarea required rows={3} value={noteForm.note} onChange={(e) => setNoteForm({ ...noteForm, note: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md" /></div>
            <div className="flex gap-2 justify-end pt-1"><button type="button" onClick={() => setShowNoteModal(false)} className="h-9 px-3 text-sm border border-gray-300 rounded-md">{t('common.cancel')}</button><button type="submit" className="h-9 px-3 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">{t('common.save')}</button></div>
          </form>
        </div></div>}
      </SidebarLayout>
    </ProtectedRoute>
  );
}
