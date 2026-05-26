'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations } from '@/app/hooks/useTranslations';
import SearchablePatientSelect from '@/app/components/SearchablePatientSelect';
import { ArrowLeft, Save, Radio } from 'lucide-react';

interface Patient { _id: string; patientId: string; name: string; email?: string; phone?: string; dateOfBirth?: string; gender?: string; }
interface Doctor { _id: string; name: string; specialization?: string; }

export default function NewRadiologyStudyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      }
    >
      <NewRadiologyStudyPageContent />
    </Suspense>
  );
}

function NewRadiologyStudyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams.get('patientId');
  const { t, translationsLoaded } = useTranslations();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const [formData, setFormData] = useState({
    patientId: '', patientName: '', patientAge: '', patientGender: '',
    referringDoctorId: '', referringDoctorName: '',
    studyType: 'x-ray', bodyPart: '', studyDescription: '',
    clinicalHistory: '', indication: '', priority: 'routine',
    scheduledDate: '', contrastUsed: false, contrastDetails: '', notes: '',
  });

  useEffect(() => { fetchDoctors(); }, []);

  const fetchDoctors = async () => {
    try {
      const response = await fetch('/api/doctors');
      if (response.ok) setDoctors(await response.json());
    } catch (error) { console.error('Error fetching doctors:', error); }
  };

  const handlePatientChange = (patient: Patient | null) => {
    setSelectedPatient(patient);
    if (patient) {
      let age = '';
      if (patient.dateOfBirth) {
        try {
          const birthDate = new Date(patient.dateOfBirth);
          const calculatedAge = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          if (!isNaN(calculatedAge) && calculatedAge >= 0) {
            age = String(calculatedAge);
          }
        } catch (e) {
          console.error('Error calculating age:', e);
        }
      }
      setFormData(prev => ({ 
        ...prev, 
        patientId: patient._id,
        patientName: patient.name, 
        patientAge: age, 
        patientGender: patient.gender || '' 
      }));
    } else {
      setFormData(prev => ({ ...prev, patientId: '', patientName: '', patientAge: '', patientGender: '' }));
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
          dateOfBirth: p.dateOfBirth,
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

  const handleDoctorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const doctorId = e.target.value;
    const doctor = doctors.find(d => d._id === doctorId);
    setFormData(prev => ({ ...prev, referringDoctorId: doctorId, referringDoctorName: doctor?.name || '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientId) { setError(t('radiology.pleaseSelectPatient')); return; }
    setSubmitting(true); setError('');

    try {
      const response = await fetch('/api/radiology', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, patientAge: formData.patientAge ? parseInt(formData.patientAge) : undefined }),
      });
      if (response.ok) {
        const study = await response.json();
        router.push(`/radiology/${study._id}`);
      } else {
        const data = await response.json();
        setError(data.error || t('common.error'));
      }
    } catch { setError(t('common.error')); }
    finally { setSubmitting(false); }
  };

  const studyTypes = [
    { value: 'x-ray', label: 'X-Ray' }, { value: 'ct-scan', label: 'CT Scan' }, { value: 'mri', label: 'MRI' },
    { value: 'ultrasound', label: 'Ultrasound' }, { value: 'mammography', label: 'Mammography' },
    { value: 'fluoroscopy', label: 'Fluoroscopy' }, { value: 'pet-scan', label: 'PET Scan' },
    { value: 'dexa-scan', label: 'DEXA Scan' }, { value: 'other', label: 'Other' },
  ];

  const bodyParts = ['Head', 'Neck', 'Chest', 'Abdomen', 'Pelvis', 'Spine - Cervical', 'Spine - Thoracic', 'Spine - Lumbar',
    'Shoulder', 'Elbow', 'Wrist', 'Hand', 'Hip', 'Knee', 'Ankle', 'Foot', 'Upper Extremity', 'Lower Extremity', 'Full Body', 'Other'];

  if (!translationsLoaded) {
    return <ProtectedRoute><SidebarLayout title="" description="" dense><div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div></div></SidebarLayout></ProtectedRoute>;
  }

  return (
    <ProtectedRoute>
      <SidebarLayout title={t('radiology.newStudy')} description={t('radiology.newStudyDescription')} dense>
        <div className="max-w-4xl">
          <Link href="/radiology" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="h-4 w-4" /><span>{t('common.back')}</span>
          </Link>

          {error && <div className="mb-4 p-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded-md">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Patient Selection */}
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
              <h3 className="text-base font-semibold mb-3 flex items-center gap-1.5"><Radio className="h-4 w-4 text-blue-600 shrink-0" />{t('radiology.patientInfo')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">{t('radiology.selectPatient')} *</label>
                  <SearchablePatientSelect value={selectedPatient?.name || ''} onChange={handlePatientChange} syncPatient={selectedPatient} placeholder={t('radiology.searchPatient')} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">{t('radiology.patientAge')}</label>
                  <input type="text" value={formData.patientAge} disabled className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md bg-gray-50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">{t('radiology.patientGender')}</label>
                  <input type="text" value={formData.patientGender} disabled className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md bg-gray-50" />
                </div>
              </div>
            </div>

            {/* Study Details */}
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
              <h3 className="text-base font-semibold mb-3">{t('radiology.studyDetails')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">{t('radiology.studyType')} *</label>
                  <select required value={formData.studyType} onChange={(e) => setFormData({ ...formData, studyType: e.target.value })}
                    className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    {studyTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">{t('radiology.bodyPart')} *</label>
                  <select required value={formData.bodyPart} onChange={(e) => setFormData({ ...formData, bodyPart: e.target.value })}
                    className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">{t('radiology.selectBodyPart')}</option>
                    {bodyParts.map(part => <option key={part} value={part}>{part}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">{t('radiology.studyDescription')} *</label>
                  <input type="text" required value={formData.studyDescription} onChange={(e) => setFormData({ ...formData, studyDescription: e.target.value })}
                    className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder={t('radiology.studyDescriptionPlaceholder')} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">{t('radiology.referringDoctor')}</label>
                  <select value={formData.referringDoctorId} onChange={handleDoctorChange}
                    className="w-full h-8 px-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">{t('radiology.selectDoctor')}</option>
                    {doctors.map(doc => <option key={doc._id} value={doc._id}>{doc.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">{t('radiology.priority')}</label>
                  <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="routine">{t('radiology.priorityLabels.routine')}</option>
                    <option value="urgent">{t('radiology.priorityLabels.urgent')}</option>
                    <option value="stat">{t('radiology.priorityLabels.stat')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">{t('radiology.scheduledDate')}</label>
                  <input type="datetime-local" value={formData.scheduledDate} onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
            </div>

            {/* Clinical Information */}
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
              <h3 className="text-base font-semibold mb-3">{t('radiology.clinicalInfo')}</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">{t('radiology.indication')}</label>
                  <input type="text" value={formData.indication} onChange={(e) => setFormData({ ...formData, indication: e.target.value })}
                    className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder={t('radiology.indicationPlaceholder')} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">{t('radiology.clinicalHistory')}</label>
                  <textarea rows={2} value={formData.clinicalHistory} onChange={(e) => setFormData({ ...formData, clinicalHistory: e.target.value })}
                    className="w-full min-h-[4rem] px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder={t('radiology.clinicalHistoryPlaceholder')} />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="contrastUsed" checked={formData.contrastUsed} onChange={(e) => setFormData({ ...formData, contrastUsed: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <label htmlFor="contrastUsed" className="text-sm font-medium text-gray-700">{t('radiology.contrastUsed')}</label>
                </div>
                {formData.contrastUsed && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">{t('radiology.contrastDetails')}</label>
                    <input type="text" value={formData.contrastDetails} onChange={(e) => setFormData({ ...formData, contrastDetails: e.target.value })}
                      className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">{t('radiology.notes')}</label>
                  <textarea rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full min-h-[3.5rem] px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-2">
              <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                <Save className="h-4 w-4" /><span>{submitting ? t('common.saving') : t('radiology.orderStudy')}</span>
              </button>
              <Link href="/radiology" className="inline-flex items-center h-9 px-4 text-sm border border-gray-300 rounded-md hover:bg-gray-50">{t('common.cancel')}</Link>
            </div>
          </form>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
