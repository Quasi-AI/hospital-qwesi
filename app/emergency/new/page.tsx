'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '../../protected-route';
import SidebarLayout from '../../components/sidebar-layout';
import { useTranslations } from '../../hooks/useTranslations';
import SearchablePatientSelect from '../../components/SearchablePatientSelect';
import SearchableDoctorSelect from '../../components/SearchableDoctorSelect';
import { 
  Siren, 
  ArrowLeft,
  User,
  AlertTriangle,
  Activity,
  Stethoscope,
  Heart,
  Thermometer,
  Wind,
  Plus,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Patient {
  _id: string;
  patientId?: string;
  name: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string | Date;
  gender?: string;
}

interface Doctor {
  _id: string;
  name: string;
  email?: string;
  specialization?: string;
}

export default function NewEmergencyCasePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-48 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-red-600" />
        </div>
      }
    >
      <NewEmergencyCasePageContent />
    </Suspense>
  );
}

function NewEmergencyCasePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams.get('patientId');
  const { t, translationsLoaded } = useTranslations();
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [symptomInput, setSymptomInput] = useState('');
  
  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    patientAge: '',
    patientGender: '',
    patientPhone: '',
    triageLevel: 'moderate',
    triageNotes: '',
    chiefComplaint: '',
    arrivalMode: 'walk-in',
    injuryType: '',
    symptoms: [] as string[],
    allergies: [] as string[],
    currentMedications: [] as string[],
    attendingDoctorId: '',
    attendingDoctorName: '',
    nurseInCharge: '',
    notes: '',
    // Initial Vital Signs
    vitalSigns: {
      bloodPressure: '',
      heartRate: '',
      temperature: '',
      respiratoryRate: '',
      oxygenSaturation: '',
      painLevel: '',
    },
  });

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handlePatientSelect = async (patient: Patient | null) => {
    setSelectedPatient(patient);
    if (patient) {
      const dateOfBirth = patient.dateOfBirth ? 
        (typeof patient.dateOfBirth === 'string' ? patient.dateOfBirth : patient.dateOfBirth.toISOString()) 
        : '';
      const age = dateOfBirth ? calculateAge(dateOfBirth) : '';
      
      setFormData({
        ...formData,
        patientId: patient._id,
        patientName: patient.name,
        patientAge: age.toString(),
        patientGender: patient.gender || '',
        patientPhone: patient.phone || '',
        allergies: [],
        currentMedications: [],
      });

      // Fetch full patient details to get allergies and medications
      try {
        const response = await fetch(`/api/patients/${patient._id}`);
        if (response.ok) {
          const fullPatient = await response.json();
          
          // Handle allergies - could be array or comma-separated string
          let allergies: string[] = [];
          if (fullPatient.allergies) {
            if (Array.isArray(fullPatient.allergies)) {
              allergies = fullPatient.allergies.filter((a: string) => a);
            } else if (typeof fullPatient.allergies === 'string') {
              allergies = fullPatient.allergies.split(',').map((a: string) => a.trim()).filter((a: string) => a);
            }
          }
          
          // Handle medications - could be array or comma-separated string
          let medications: string[] = [];
          if (fullPatient.currentMedications) {
            if (Array.isArray(fullPatient.currentMedications)) {
              medications = fullPatient.currentMedications.filter((m: string) => m);
            } else if (typeof fullPatient.currentMedications === 'string') {
              medications = fullPatient.currentMedications.split(',').map((m: string) => m.trim()).filter((m: string) => m);
            }
          }
          
          setFormData(prev => ({
            ...prev,
            allergies,
            currentMedications: medications,
          }));
        }
      } catch (error) {
        console.error('Error fetching patient details:', error);
      }
    } else {
      setFormData({
        ...formData,
        patientId: '',
        patientName: '',
        patientAge: '',
        patientGender: '',
        patientPhone: '',
        allergies: [],
        currentMedications: [],
      });
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
        await handlePatientSelect(mapped);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientIdFromUrl]);

  const handleDoctorSelect = (doctor: Doctor | null) => {
    if (doctor) {
      setFormData((prev) => ({
        ...prev,
        attendingDoctorId: doctor._id,
        attendingDoctorName: doctor.name,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        attendingDoctorId: '',
        attendingDoctorName: '',
      }));
    }
  };

  const handleAddSymptom = () => {
    if (symptomInput.trim() && !formData.symptoms.includes(symptomInput.trim())) {
      setFormData({
        ...formData,
        symptoms: [...formData.symptoms, symptomInput.trim()],
      });
      setSymptomInput('');
    }
  };

  const handleRemoveSymptom = (symptom: string) => {
    setFormData({
      ...formData,
      symptoms: formData.symptoms.filter(s => s !== symptom),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patientId) {
      toast.error(t('emergency.validation.patientRequired') || 'Please select a patient');
      return;
    }

    if (!formData.chiefComplaint.trim()) {
      toast.error(t('emergency.validation.complaintRequired') || 'Chief complaint is required');
      return;
    }

    setLoading(true);

    try {
      // Prepare vital signs if any values are provided
      const vitalSigns = Object.values(formData.vitalSigns).some(v => v) ? {
        bloodPressure: formData.vitalSigns.bloodPressure || undefined,
        heartRate: formData.vitalSigns.heartRate ? parseInt(formData.vitalSigns.heartRate) : undefined,
        temperature: formData.vitalSigns.temperature ? parseFloat(formData.vitalSigns.temperature) : undefined,
        respiratoryRate: formData.vitalSigns.respiratoryRate ? parseInt(formData.vitalSigns.respiratoryRate) : undefined,
        oxygenSaturation: formData.vitalSigns.oxygenSaturation ? parseInt(formData.vitalSigns.oxygenSaturation) : undefined,
        painLevel: formData.vitalSigns.painLevel ? parseInt(formData.vitalSigns.painLevel) : undefined,
      } : undefined;

      const response = await fetch('/api/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: formData.patientId,
          patientName: formData.patientName,
          patientAge: formData.patientAge ? parseInt(formData.patientAge) : undefined,
          patientGender: formData.patientGender,
          patientPhone: formData.patientPhone,
          triageLevel: formData.triageLevel,
          triageNotes: formData.triageNotes,
          chiefComplaint: formData.chiefComplaint,
          arrivalMode: formData.arrivalMode,
          injuryType: formData.injuryType || undefined,
          symptoms: formData.symptoms,
          allergies: formData.allergies,
          currentMedications: formData.currentMedications,
          attendingDoctorId: formData.attendingDoctorId || undefined,
          attendingDoctorName: formData.attendingDoctorName || undefined,
          nurseInCharge: formData.nurseInCharge || undefined,
          vitalSigns,
          notes: formData.notes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create emergency case');
      }

      const data = await response.json();
      toast.success(t('emergency.createSuccess') || 'Emergency case created successfully');
      router.push(`/emergency/${data._id}`);
    } catch (error) {
      console.error('Error creating emergency case:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create emergency case');
    } finally {
      setLoading(false);
    }
  };

  const getTriageDescription = (level: string) => {
    switch (level) {
      case 'critical':
        return t('emergency.triageDesc.critical') || 'Immediate life-threatening condition';
      case 'urgent':
        return t('emergency.triageDesc.urgent') || 'Potentially life-threatening, needs rapid attention';
      case 'moderate':
        return t('emergency.triageDesc.moderate') || 'Serious but stable condition';
      case 'minor':
        return t('emergency.triageDesc.minor') || 'Minor injuries or illness';
      case 'non-urgent':
        return t('emergency.triageDesc.non-urgent') || 'Non-urgent, can wait';
      default:
        return '';
    }
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout
          title={t('emergency.newCase') || 'New Emergency Case'}
          description={t('emergency.newCaseDesc') || 'Register a new emergency patient'}
          dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-red-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title={t('emergency.newCase') || 'New Emergency Case'} 
        description={t('emergency.newCaseDesc') || 'Register a new emergency patient'} dense>
        <div className="mx-auto max-w-4xl space-y-3">
          <Link
            href="/emergency"
            className="mb-1 inline-flex items-center text-xs text-red-600 hover:text-red-800"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            {t('emergency.backToEmergency') || 'Back to Emergency'}
          </Link>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <User className="mr-1.5 h-4 w-4 text-red-600" />
                {t('emergency.patientLookup') || 'Patient Lookup'}
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('emergency.searchPatient') || 'Search Patient'} <span className="text-red-500">*</span>
                  </label>
                  <SearchablePatientSelect
                    value={selectedPatient?.name || ''}
                    onChange={handlePatientSelect}
                    syncPatient={selectedPatient}
                    placeholder={t('emergency.searchPatientPlaceholder') || 'Search by name, phone, or email...'}
                  />
                </div>

                {selectedPatient && (
                  <div className="grid grid-cols-2 gap-3 rounded-md bg-gray-50 p-3 md:grid-cols-4">
                    <div>
                      <span className="text-xs text-gray-500">{t('emergency.name') || 'Name'}</span>
                      <p className="text-sm font-medium">{formData.patientName}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">{t('emergency.age') || 'Age'}</span>
                      <p className="text-sm font-medium">{formData.patientAge || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">{t('emergency.gender') || 'Gender'}</span>
                      <p className="text-sm font-medium">{formData.patientGender || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">{t('emergency.phone') || 'Phone'}</span>
                      <p className="text-sm font-medium">{formData.patientPhone || '-'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <AlertTriangle className="mr-1.5 h-4 w-4 text-red-600" />
                {t('emergency.triageAssessment') || 'Triage Assessment'}
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700">
                    {t('emergency.triageLevel') || 'Triage Level'} <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {['critical', 'urgent', 'moderate', 'minor', 'non-urgent'].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setFormData({ ...formData, triageLevel: level })}
                        className={`rounded-md border-2 p-2 text-center transition-all ${
                          formData.triageLevel === level
                            ? level === 'critical' ? 'border-red-600 bg-red-50' :
                              level === 'urgent' ? 'border-orange-500 bg-orange-50' :
                              level === 'moderate' ? 'border-yellow-500 bg-yellow-50' :
                              level === 'minor' ? 'border-green-500 bg-green-50' :
                              'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`text-lg font-bold leading-none ${
                          level === 'critical' ? 'text-red-600' :
                          level === 'urgent' ? 'text-orange-500' :
                          level === 'moderate' ? 'text-yellow-600' :
                          level === 'minor' ? 'text-green-500' :
                          'text-blue-500'
                        }`}>
                          {level === 'critical' ? '1' :
                           level === 'urgent' ? '2' :
                           level === 'moderate' ? '3' :
                           level === 'minor' ? '4' : '5'}
                        </div>
                        <div className="mt-1 text-[10px] font-medium leading-tight text-gray-700">
                          {t(`emergency.triageLabels.${level}`) || level.charAt(0).toUpperCase() + level.slice(1)}
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">{getTriageDescription(formData.triageLevel)}</p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('emergency.chiefComplaint') || 'Chief Complaint'} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.chiefComplaint}
                    onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500"
                    rows={3}
                    placeholder={t('emergency.chiefComplaintPlaceholder') || 'Describe the main reason for the emergency visit...'}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      {t('emergency.arrivalMode') || 'Arrival Mode'}
                    </label>
                    <select
                      value={formData.arrivalMode}
                      onChange={(e) => setFormData({ ...formData, arrivalMode: e.target.value })}
                      className="h-9 w-full rounded-md border border-gray-300 px-3 py-0 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500"
                    >
                      <option value="walk-in">{t('emergency.arrivalModes.walk-in') || 'Walk-in'}</option>
                      <option value="ambulance">{t('emergency.arrivalModes.ambulance') || 'Ambulance'}</option>
                      <option value="police">{t('emergency.arrivalModes.police') || 'Police'}</option>
                      <option value="referral">{t('emergency.arrivalModes.referral') || 'Referral'}</option>
                      <option value="other">{t('emergency.arrivalModes.other') || 'Other'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      {t('emergency.injuryType') || 'Injury/Condition Type'}
                    </label>
                    <select
                      value={formData.injuryType}
                      onChange={(e) => setFormData({ ...formData, injuryType: e.target.value })}
                      className="h-9 w-full rounded-md border border-gray-300 px-3 py-0 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">{t('emergency.selectInjuryType') || 'Select Type'}</option>
                      <option value="trauma">{t('emergency.injuryTypes.trauma') || 'Trauma'}</option>
                      <option value="medical">{t('emergency.injuryTypes.medical') || 'Medical'}</option>
                      <option value="surgical">{t('emergency.injuryTypes.surgical') || 'Surgical'}</option>
                      <option value="pediatric">{t('emergency.injuryTypes.pediatric') || 'Pediatric'}</option>
                      <option value="obstetric">{t('emergency.injuryTypes.obstetric') || 'Obstetric'}</option>
                      <option value="psychiatric">{t('emergency.injuryTypes.psychiatric') || 'Psychiatric'}</option>
                      <option value="other">{t('emergency.injuryTypes.other') || 'Other'}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('emergency.triageNotes') || 'Triage Notes'}
                  </label>
                  <textarea
                    value={formData.triageNotes}
                    onChange={(e) => setFormData({ ...formData, triageNotes: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500"
                    rows={2}
                    placeholder={t('emergency.triageNotesPlaceholder') || 'Additional triage observations...'}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700">
                    {t('emergency.symptoms') || 'Symptoms'}
                  </label>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {formData.symptoms.map((symptom) => (
                      <span
                        key={symptom}
                        className="inline-flex items-center rounded-md bg-red-100 px-2 py-0.5 text-xs text-red-800"
                      >
                        {symptom}
                        <button
                          type="button"
                          onClick={() => handleRemoveSymptom(symptom)}
                          className="ml-1 text-red-600 hover:text-red-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={symptomInput}
                      onChange={(e) => setSymptomInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSymptom())}
                      className="h-9 flex-1 rounded-md border border-gray-300 px-3 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500"
                      placeholder={t('emergency.addSymptomPlaceholder') || 'Add symptom and press Enter'}
                    />
                    <button
                      type="button"
                      onClick={handleAddSymptom}
                      className="inline-flex h-9 items-center rounded-md bg-gray-100 px-3 text-gray-700 hover:bg-gray-200"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <Activity className="mr-1.5 h-4 w-4 text-red-600" />
                {t('emergency.initialVitals') || 'Initial Vital Signs'}
              </h3>
              
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 flex items-center text-xs font-medium text-gray-700">
                    <Heart className="mr-1 h-3.5 w-3.5 text-red-500" />
                    {t('emergency.bloodPressure') || 'Blood Pressure'}
                  </label>
                  <input
                    type="text"
                    value={formData.vitalSigns.bloodPressure}
                    onChange={(e) => setFormData({
                      ...formData,
                      vitalSigns: { ...formData.vitalSigns, bloodPressure: e.target.value }
                    })}
                    className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500"
                    placeholder="120/80"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('emergency.heartRate') || 'Heart Rate'} (bpm)
                  </label>
                  <input
                    type="number"
                    value={formData.vitalSigns.heartRate}
                    onChange={(e) => setFormData({
                      ...formData,
                      vitalSigns: { ...formData.vitalSigns, heartRate: e.target.value }
                    })}
                    className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500"
                    placeholder="72"
                  />
                </div>

                <div>
                  <label className="mb-1 flex items-center text-xs font-medium text-gray-700">
                    <Thermometer className="mr-1 h-3.5 w-3.5 text-orange-500" />
                    {t('emergency.temperature') || 'Temperature'} (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.vitalSigns.temperature}
                    onChange={(e) => setFormData({
                      ...formData,
                      vitalSigns: { ...formData.vitalSigns, temperature: e.target.value }
                    })}
                    className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500"
                    placeholder="37.0"
                  />
                </div>

                <div>
                  <label className="mb-1 flex items-center text-xs font-medium text-gray-700">
                    <Wind className="mr-1 h-3.5 w-3.5 text-blue-500" />
                    {t('emergency.respiratoryRate') || 'Respiratory Rate'}
                  </label>
                  <input
                    type="number"
                    value={formData.vitalSigns.respiratoryRate}
                    onChange={(e) => setFormData({
                      ...formData,
                      vitalSigns: { ...formData.vitalSigns, respiratoryRate: e.target.value }
                    })}
                    className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500"
                    placeholder="16"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('emergency.oxygenSaturation') || 'SpO2'} (%)
                  </label>
                  <input
                    type="number"
                    value={formData.vitalSigns.oxygenSaturation}
                    onChange={(e) => setFormData({
                      ...formData,
                      vitalSigns: { ...formData.vitalSigns, oxygenSaturation: e.target.value }
                    })}
                    className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500"
                    placeholder="98"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('emergency.painLevel') || 'Pain Level'} (0-10)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={formData.vitalSigns.painLevel}
                    onChange={(e) => setFormData({
                      ...formData,
                      vitalSigns: { ...formData.vitalSigns, painLevel: e.target.value }
                    })}
                    className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500"
                    placeholder="5"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <Stethoscope className="mr-1.5 h-4 w-4 text-red-600" />
                {t('emergency.attendingStaff') || 'Attending Staff'}
              </h3>
              
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('emergency.attendingDoctor') || 'Attending Doctor'}
                  </label>
                  <SearchableDoctorSelect
                    value={formData.attendingDoctorName || ''}
                    onChange={(d) =>
                      handleDoctorSelect(
                        d
                          ? {
                              _id: d._id,
                              name: d.name,
                              email: d.email,
                              specialization: d.specialization,
                            }
                          : null
                      )
                    }
                    placeholder={t('emergency.selectDoctor') || 'Search for a doctor...'}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {t('emergency.nurseInCharge') || 'Nurse In Charge'}
                  </label>
                  <input
                    type="text"
                    value={formData.nurseInCharge}
                    onChange={(e) => setFormData({ ...formData, nurseInCharge: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500"
                    placeholder={t('emergency.nursePlaceholder') || 'Enter nurse name'}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                {t('emergency.additionalNotes') || 'Additional Notes'}
              </h3>
              
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500"
                rows={3}
                placeholder={t('emergency.notesPlaceholder') || 'Any additional information...'}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Link
                href="/emergency"
                className="inline-flex h-9 items-center rounded-md border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50"
              >
                {t('common.cancel') || 'Cancel'}
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-9 items-center rounded-md bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-b-2 border-white" />
                    {t('common.saving') || 'Saving...'}
                  </>
                ) : (
                  <>
                    <Siren className="mr-1.5 h-3.5 w-3.5" />
                    {t('emergency.registerCase') || 'Register Emergency Case'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
