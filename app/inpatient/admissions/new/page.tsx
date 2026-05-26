'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations } from '@/app/hooks/useTranslations';
import { useFormatCurrency } from '@/app/hooks/useFormatCurrency';
import SearchablePatientSelect from '@/app/components/SearchablePatientSelect';
import { ArrowLeft, Save, UserPlus } from 'lucide-react';

interface Ward { _id: string; wardNumber: string; name: string; type: string; availableBeds: number; dailyRate: number; }
interface Bed { _id: string; bedNumber: string; type: string; status: string; dailyRate: number; }
interface Doctor { _id: string; name: string; specialization?: string; }
interface Patient { _id: string; patientId: string; name: string; email?: string; phone?: string; age?: number; gender?: string; }

export default function NewAdmissionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      }
    >
      <NewAdmissionPageContent />
    </Suspense>
  );
}

function NewAdmissionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams.get('patientId');
  const { t, translationsLoaded } = useTranslations();
  const { formatCurrency } = useFormatCurrency();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [wards, setWards] = useState<Ward[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [formData, setFormData] = useState({
    patientId: '', patientName: '', patientEmail: '', patientPhone: '', patientAge: 0, patientGender: '',
    wardId: '', bedId: '', admittingDoctorId: '', admittingDoctorName: '', admissionType: 'elective',
    admissionDate: new Date().toISOString().split('T')[0], expectedDischargeDate: '',
    chiefComplaint: '', admissionDiagnosis: '', priority: 'normal', allergies: [] as string[],
    dietaryRestrictions: '', specialInstructions: '',
    emergencyContactName: '', emergencyContactRelationship: '', emergencyContactPhone: '',
  });
  const [newAllergy, setNewAllergy] = useState('');

  useEffect(() => { fetchWards(); fetchDoctors(); }, []);
  useEffect(() => { if (formData.wardId) fetchBeds(formData.wardId); else setBeds([]); }, [formData.wardId]);

  const fetchWards = async () => {
    const res = await fetch('/api/inpatient/wards?isActive=true&hasAvailableBeds=true');
    if (res.ok) setWards(await res.json());
  };
  const fetchBeds = async (wardId: string) => {
    const res = await fetch(`/api/inpatient/beds?wardId=${wardId}&status=available`);
    if (res.ok) setBeds(await res.json());
  };
  const fetchDoctors = async () => {
    const res = await fetch('/api/doctors');
    if (res.ok) setDoctors(await res.json());
  };

  const handlePatientChange = (patient: Patient | null) => {
    setSelectedPatient(patient);
    if (patient) {
      setFormData({ ...formData, patientId: patient._id, patientName: patient.name,
        patientEmail: patient.email || '', patientPhone: patient.phone || '',
        patientAge: patient.age || 0, patientGender: patient.gender || '' });
    } else {
      setFormData({ ...formData, patientId: '', patientName: '', patientEmail: '', patientPhone: '', patientAge: 0, patientGender: '' });
    }
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
        const mapped: Patient = {
          _id: p._id,
          patientId: p.patientId || p._id,
          name: p.name,
          email: p.email,
          phone: p.phone,
          age: p.age,
          gender: p.gender,
        };
        handlePatientChange(mapped);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientIdFromUrl]);

  const handleDoctorChange = (doctorId: string) => {
    const doctor = doctors.find(d => d._id === doctorId);
    setFormData({ ...formData, admittingDoctorId: doctorId, admittingDoctorName: doctor?.name || '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientId) { setError(t('inpatient.selectPatientError')); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/inpatient/admissions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, emergencyContact: { name: formData.emergencyContactName, relationship: formData.emergencyContactRelationship, phone: formData.emergencyContactPhone } }),
      });
      if (res.ok) router.push('/inpatient/admissions');
      else { const data = await res.json(); setError(data.error || t('common.error')); }
    } catch { setError(t('common.error')); }
    finally { setLoading(false); }
  };

  const addAllergy = () => { if (newAllergy.trim() && !formData.allergies.includes(newAllergy.trim())) { setFormData({ ...formData, allergies: [...formData.allergies, newAllergy.trim()] }); setNewAllergy(''); } };
  const removeAllergy = (a: string) => setFormData({ ...formData, allergies: formData.allergies.filter(x => x !== a) });

  if (!translationsLoaded) return <ProtectedRoute><SidebarLayout title="" description="" dense><div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div></div></SidebarLayout></ProtectedRoute>;

  return (
    <ProtectedRoute>
      <SidebarLayout title={t('inpatient.newAdmission')} description={t('inpatient.newAdmissionDescription')} dense>
        <div className="max-w-4xl">
          <Link href="/inpatient/admissions" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="h-4 w-4" /><span>{t('common.back')}</span>
          </Link>
          {error && <div className="mb-4 p-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded-md">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Patient */}
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
              <h3 className="text-base font-semibold mb-3 flex items-center gap-1.5"><UserPlus className="h-4 w-4 text-blue-600 shrink-0" />{t('inpatient.patientInfo')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.selectPatient')} *</label>
                  <SearchablePatientSelect value={selectedPatient?.name || ''} onChange={handlePatientChange} syncPatient={selectedPatient} placeholder={t('inpatient.searchPatient')} />
                </div>
                {selectedPatient && (<>
                  <div><label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.email')}</label><input type="email" value={formData.patientEmail} disabled className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md bg-gray-50" /></div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.phone')}</label><input type="tel" value={formData.patientPhone} disabled className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md bg-gray-50" /></div>
                </>)}
              </div>
            </div>
            {/* Ward & Bed */}
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
              <h3 className="text-base font-semibold mb-3">{t('inpatient.wardBedAssignment')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.ward')} *</label>
                  <select required value={formData.wardId} onChange={(e) => setFormData({ ...formData, wardId: e.target.value, bedId: '' })} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">{t('inpatient.selectWard')}</option>
                    {wards.map(w => <option key={w._id} value={w._id}>{w.name} ({w.wardNumber}) - {w.availableBeds} beds</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.bed')} *</label>
                  <select required value={formData.bedId} onChange={(e) => setFormData({ ...formData, bedId: e.target.value })} disabled={!formData.wardId} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">{t('inpatient.selectBed')}</option>
                    {beds.map(b => <option key={b._id} value={b._id}>{b.bedNumber} - {formatCurrency(b.dailyRate)}/day</option>)}
                  </select>
                </div>
              </div>
            </div>
            {/* Doctor & Details */}
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
              <h3 className="text-base font-semibold mb-3">{t('inpatient.admissionDetails')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.admittingDoctor')} *</label>
                  <select required value={formData.admittingDoctorId} onChange={(e) => handleDoctorChange(e.target.value)} className="w-full h-8 px-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">{t('inpatient.selectDoctor')}</option>
                    {doctors.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.admissionType')} *</label>
                  <select required value={formData.admissionType} onChange={(e) => setFormData({ ...formData, admissionType: e.target.value })} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="elective">{t('inpatient.admissionTypes.elective')}</option>
                    <option value="emergency">{t('inpatient.admissionTypes.emergency')}</option>
                    <option value="transfer">{t('inpatient.admissionTypes.transfer')}</option>
                    <option value="referral">{t('inpatient.admissionTypes.referral')}</option>
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.admissionDate')} *</label>
                  <input type="date" required value={formData.admissionDate} onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.priority')} *</label>
                  <select required value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="normal">{t('inpatient.priorityLabels.normal')}</option>
                    <option value="urgent">{t('inpatient.priorityLabels.urgent')}</option>
                    <option value="critical">{t('inpatient.priorityLabels.critical')}</option>
                  </select>
                </div>
              </div>
              <div className="mt-3"><label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.chiefComplaint')} *</label>
                <textarea required rows={2} value={formData.chiefComplaint} onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="mt-3"><label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.admissionDiagnosis')}</label>
                <textarea rows={2} value={formData.admissionDiagnosis} onChange={(e) => setFormData({ ...formData, admissionDiagnosis: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
            {/* Allergies */}
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
              <h3 className="text-base font-semibold mb-3">{t('inpatient.medicalInfo')}</h3>
              <div className="mb-2"><label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.allergies')}</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={newAllergy} onChange={(e) => setNewAllergy(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())} className="flex-1 h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder={t('inpatient.allergyPlaceholder')} />
                  <button type="button" onClick={addAllergy} className="h-9 px-3 text-sm bg-gray-100 rounded-md hover:bg-gray-200 shrink-0">{t('common.add')}</button>
                </div>
                <div className="flex flex-wrap gap-1.5">{formData.allergies.map((a, i) => <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs">{a}<button type="button" onClick={() => removeAllergy(a)}>×</button></span>)}</div>
              </div>
            </div>
            {/* Emergency Contact */}
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
              <h3 className="text-base font-semibold mb-3">{t('inpatient.emergencyContact')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.contactName')}</label><input type="text" value={formData.emergencyContactName} onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.relationship')}</label><input type="text" value={formData.emergencyContactRelationship} onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-0.5">{t('inpatient.contactPhone')}</label><input type="tel" value={formData.emergencyContactPhone} onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
              </div>
            </div>
            {/* Submit */}
            <div className="flex items-center gap-2">
              <button type="submit" disabled={loading} className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                <Save className="h-4 w-4" /><span>{loading ? t('common.saving') : t('inpatient.admitPatient')}</span>
              </button>
              <Link href="/inpatient/admissions" className="inline-flex items-center h-9 px-4 text-sm border border-gray-300 rounded-md hover:bg-gray-50">{t('common.cancel')}</Link>
            </div>
          </form>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
