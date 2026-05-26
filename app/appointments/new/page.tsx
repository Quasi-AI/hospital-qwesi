'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Stethoscope,
  Save,
  ArrowLeft,
  AlertCircle,
  FileText,
  Settings,
  CheckCircle,
  Shield,
  Award,
  GraduationCap,
  Building,
  Video,
  Mic,
  MessageCircle,
  LayoutGrid
} from 'lucide-react';
import ProtectedRoute from '../../protected-route';
import SidebarLayout from '../../components/sidebar-layout';
import SearchablePatientSelect from '../../components/SearchablePatientSelect';
import SearchableDoctorSelect from '../../components/SearchableDoctorSelect';
import { useTranslations } from '../../hooks/useTranslations';

interface Patient {
  _id: string;
  patientId: string;
  name: string;
  email: string;
  phone: string;
}

interface AppointmentFormData {
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  location: string;
  reason: string;
  notes: string;
  status: string;
  includeVideoCall: boolean;
  consultationType: 'video' | 'audio' | 'chat';
  sessionDuration: number;
}

interface Doctor {
  _id: string;
  name: string;
  email: string;
  role?: string;
  qualifications?: string[];
  specialization?: string;
  department?: string;
}

function normalizeTimeLabel(t: string): string {
  const m = String(t || '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})/);
  if (!m) return '';
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export default function NewAppointmentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      }
    >
      <NewAppointmentPageContent />
    </Suspense>
  );
}

function NewAppointmentPageContent() {
  const { t } = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams.get('patientId');
  const doctorIdFromUrl = searchParams.get('doctorId');
  const dateFromUrl = searchParams.get('date') ?? searchParams.get('appointmentDate');
  const timeFromUrl = searchParams.get('time') ?? searchParams.get('appointmentTime');
  const pendingTimeFromUrlRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'patient' | 'appointment' | 'details' | 'review'>('patient');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [daySlots, setDaySlots] = useState<{ time: string; available: boolean }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsLoaded, setSlotsLoaded] = useState(false);

  const [formData, setFormData] = useState<AppointmentFormData>({
    patientName: '',
    patientEmail: '',
    patientPhone: '',
    doctorName: '',
    appointmentDate: '',
    appointmentTime: '',
    appointmentType: 'consultation',
    location: '',
    reason: '',
    notes: '',
    status: 'scheduled',
    includeVideoCall: false,
    consultationType: 'video',
    sessionDuration: 30
  });

  // Auto-set doctor if logged in as doctor
  useEffect(() => {
    if (session?.user?.role === 'doctor' && session.user.name) {
      const doctor: Doctor = {
        _id: session.user.id || '',
        name: session.user.name,
        email: session.user.email || '',
        role: 'doctor'
      };
      setSelectedDoctor(doctor);
      setFormData(prev => ({
        ...prev,
        doctorName: session.user.name
      }));
    }
  }, [session]);

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
          email: p.email || '',
          phone: p.phone || '',
        };
        setSelectedPatient(mapped);
        setFormData((prev) => ({
          ...prev,
          patientName: mapped.name,
          patientEmail: mapped.email,
          patientPhone: mapped.phone,
        }));
      } catch {
        /* ignore prefill errors */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientIdFromUrl]);

  useEffect(() => {
    if (!doctorIdFromUrl || !/^[a-f0-9]{24}$/i.test(doctorIdFromUrl.trim())) return;
    if (session?.user?.role === 'doctor') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/doctors?id=${encodeURIComponent(doctorIdFromUrl.trim())}`);
        if (!res.ok || cancelled) return;
        const d = await res.json();
        if (cancelled) return;
        if (d?.role && d.role !== 'doctor') return;
        const mapped: Doctor = {
          _id: d._id || doctorIdFromUrl.trim(),
          name: d.name || '',
          email: d.email || '',
          role: d.role,
          qualifications: d.qualifications,
          specialization: d.specialization,
          department: d.department,
        };
        setSelectedDoctor(mapped);
        setFormData((prev) => ({
          ...prev,
          doctorName: mapped.name,
        }));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doctorIdFromUrl, session?.user?.role]);

  useEffect(() => {
    if (!dateFromUrl || !/^\d{4}-\d{2}-\d{2}$/.test(dateFromUrl.trim())) return;
    setFormData((prev) => ({ ...prev, appointmentDate: dateFromUrl.trim() }));
  }, [dateFromUrl]);

  useEffect(() => {
    if (!timeFromUrl) return;
    const n = normalizeTimeLabel(timeFromUrl);
    if (n) pendingTimeFromUrlRef.current = n;
  }, [timeFromUrl]);

  const doctorIdLooksValid = (id: string | undefined) =>
    !!id && /^[a-f0-9]{24}$/i.test(id.trim());

  useEffect(() => {
    const doctorId = selectedDoctor?._id?.trim();
    const date = formData.appointmentDate;
    if (!doctorIdLooksValid(doctorId) || !date) {
      setDaySlots([]);
      setSlotsLoaded(false);
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    setSlotsLoaded(false);
    setFormData((prev) => ({ ...prev, appointmentTime: '' }));
    fetch(`/api/appointments/slots?doctorId=${encodeURIComponent(doctorId!)}&date=${encodeURIComponent(date)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const slots = Array.isArray(data.slots) ? data.slots : [];
        setDaySlots(slots);
        setSlotsLoaded(true);
        const pending = pendingTimeFromUrlRef.current;
        if (
          pending &&
          slots.some(
            (s: { time: string; available: boolean }) => s.time === pending && s.available
          )
        ) {
          setFormData((prev) => ({ ...prev, appointmentTime: pending }));
          pendingTimeFromUrlRef.current = null;
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDaySlots([]);
          setSlotsLoaded(true);
        }
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDoctor?._id, formData.appointmentDate]);

  // Handle doctor selection
  const handleDoctorSelect = (doctor: Doctor | null) => {
    setSelectedDoctor(doctor);
    if (doctor) {
      setFormData(prev => ({
        ...prev,
        doctorName: doctor.name
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        doctorName: ''
      }));
    }
  };

  const appointmentTypes = [
    { value: 'consultation', label: t('appointments.types.consultation') },
    { value: 'follow-up', label: t('appointments.types.followUp') },
    { value: 'checkup', label: t('appointments.types.checkup') },
    { value: 'emergency', label: t('appointments.types.emergency') },
    { value: 'surgery', label: t('appointments.types.surgery') },
    { value: 'therapy', label: t('appointments.types.therapy') }
  ];

  const statusOptions = [
    { value: 'scheduled', label: t('appointments.status.scheduled') },
    { value: 'confirmed', label: t('appointments.status.confirmed') },
    { value: 'in-progress', label: t('appointments.status.inProgress') },
    { value: 'completed', label: t('appointments.status.completed') },
    { value: 'cancelled', label: t('appointments.status.cancelled') }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePatientSelect = (patient: Patient | null) => {
    setSelectedPatient(patient);
    if (patient) {
      setFormData(prev => ({
        ...prev,
        patientName: patient.name,
        patientEmail: patient.email,
        patientPhone: patient.phone
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        patientName: '',
        patientEmail: '',
        patientPhone: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.patientName.trim()) {
      newErrors.patientName = t('appointments.validation.patientNameRequired');
    }

    if (!formData.patientEmail.trim()) {
      newErrors.patientEmail = t('appointments.validation.patientEmailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.patientEmail)) {
      newErrors.patientEmail = t('appointments.validation.patientEmailInvalid');
    }

    if (!formData.patientPhone.trim()) {
      newErrors.patientPhone = t('appointments.validation.patientPhoneRequired');
    }

    if (!formData.doctorName.trim()) {
      newErrors.doctorName = t('appointments.validation.doctorNameRequired');
    }

    if (!formData.appointmentDate) {
      newErrors.appointmentDate = t('appointments.validation.appointmentDateRequired');
    } else {
      const selectedDate = new Date(formData.appointmentDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.appointmentDate = t('appointments.validation.appointmentDatePast');
      }
    }

    if (!formData.appointmentTime) {
      newErrors.appointmentTime = t('appointments.validation.appointmentTimeRequired');
    }

    if (!formData.reason.trim()) {
      newErrors.reason = t('appointments.validation.reasonRequired');
    }

    // Video consultation requires a patient selected from the list (must exist in system)
    if (formData.includeVideoCall && !selectedPatient?._id) {
      newErrors.patientName = t('appointments.videoCall.selectPatientForVideo') || 'Select a patient from the list to create a video consultation.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Only allow submission from the Review tab when user explicitly clicks Create
    if (activeTab !== 'review') {
      return;
    }
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        patientId: selectedPatient?._id,
        patientName: selectedPatient?.name || formData.patientName,
        patientEmail: selectedPatient?.email || formData.patientEmail,
        patientPhone: formData.patientPhone,
        doctorId: selectedDoctor?._id,
        doctorEmail: selectedDoctor?.email,
        doctorName: selectedDoctor?.name || formData.doctorName,
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
        appointmentType: formData.appointmentType,
        status: formData.status,
        location: formData.location,
        reason: formData.reason,
        notes: formData.notes,
        includeVideoCall: formData.includeVideoCall,
        consultationType: formData.consultationType,
        sessionDuration: formData.sessionDuration,
      };

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.telemedicineSkipped && data.telemedicineReason) {
          alert(`${data.telemedicineReason}\n\nAppointment was created successfully.`);
        }
        router.push('/appointments');
      } else {
        const errorData = await response.json();
        console.error('Error creating appointment:', errorData);
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/appointments');
  };

  const nextTab = () => {
    const tabs = ['patient', 'appointment', 'details', 'review'];
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1] as any);
    }
  };

  const prevTab = () => {
    const tabs = ['patient', 'appointment', 'details', 'review'];
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1] as any);
    }
  };

  const isTabValid = (tab: string) => {
    switch (tab) {
      case 'patient':
        return formData.patientName && formData.patientEmail && formData.patientPhone;
      case 'appointment':
        return formData.doctorName && formData.appointmentDate && formData.appointmentTime;
      case 'details':
        return formData.reason;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  return (
    <ProtectedRoute>
      <SidebarLayout
        title={t('appointments.newAppointment')}
        description={t('appointments.newAppointmentDesc')}
        dense
      >
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <div className="mb-2">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              {t('common.back')}
            </button>
          </div>

          {/* Progress Steps */}
          <div className="mb-3 hidden overflow-x-auto lg:block">
            <div className="flex min-w-max items-center justify-between gap-1">
              {[
                { id: 'patient', label: t('appointments.tabs.patientInfo'), icon: User },
                { id: 'appointment', label: t('appointments.tabs.appointmentDetails'), icon: Calendar },
                { id: 'details', label: t('appointments.tabs.additionalInfo'), icon: FileText },
                { id: 'review', label: t('appointments.tabs.review'), icon: CheckCircle }
              ].map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                    activeTab === step.id 
                      ? 'border-blue-600 bg-blue-600 text-white' 
                      : isTabValid(step.id)
                        ? 'border-green-500 bg-green-100 text-green-600'
                        : 'border-gray-300 bg-gray-100 text-gray-500'
                  }`}>
                    <step.icon className="h-4 w-4" />
                  </div>
                  <div className="ml-2 max-w-[7rem] sm:max-w-none">
                    <p className={`text-xs font-medium leading-tight ${
                      activeTab === step.id ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {step.label}
                    </p>
                  </div>
                  {index < 3 && (
                    <div className={`mx-2 h-0.5 w-8 shrink-0 sm:mx-3 sm:w-12 ${
                      isTabValid(step.id) ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-3 border-b border-gray-200">
            <nav className="-mb-px flex flex-wrap gap-x-4 gap-y-1 sm:gap-x-6">
              {[
                { id: 'patient', label: t('appointments.tabs.patientInfo'), icon: User },
                { id: 'appointment', label: t('appointments.tabs.appointmentDetails'), icon: Calendar },
                { id: 'details', label: t('appointments.tabs.additionalInfo'), icon: FileText },
                { id: 'review', label: t('appointments.tabs.review'), icon: CheckCircle }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 border-b-2 px-0.5 py-1.5 text-xs font-medium sm:text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                  <span className="truncate">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
            {/* Patient Information Tab */}
            {activeTab === 'patient' && (
              <div className="space-y-3">
                <div className="mb-2 flex items-center gap-2">
                  <User className="h-5 w-5 shrink-0 text-blue-600" />
                  <h2 className="text-base font-semibold text-gray-900">{t('appointments.tabs.patientInfo')}</h2>
                </div>
                
                {/* Patient Selection */}
                <div className="mb-3">
                  <label className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    {t('appointments.selectPatient')} *
                  </label>
                  <SearchablePatientSelect
                    value={selectedPatient?.name || ''}
                    onChange={handlePatientSelect}
                    syncPatient={selectedPatient}
                    placeholder={t('appointments.placeholders.selectPatient')}
                    className="w-full"
                  />
                  {errors.patientName && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.patientName}
                    </p>
                  )}
                </div>

                {/* Manual Patient Entry */}
                <div className="border-t border-gray-100 pt-3">
                  <div className="mb-2 flex flex-wrap items-baseline gap-1.5">
                    <h3 className="text-sm font-medium text-gray-900 sm:text-base">{t('appointments.manualEntry')}</h3>
                    <span className="text-xs text-gray-500">({t('appointments.or')})</span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                    <div>
                      <label htmlFor="patientEmail" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                        {t('appointments.patientEmail')} *
                      </label>
                      <input
                        type="email"
                        id="patientEmail"
                        name="patientEmail"
                        value={formData.patientEmail}
                        onChange={handleInputChange}
                        className={`h-9 w-full rounded-md border px-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 ${
                          errors.patientEmail ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder={t('appointments.placeholders.patientEmail')}
                      />
                      {errors.patientEmail && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.patientEmail}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="patientPhone" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                        {t('appointments.patientPhone')} *
                      </label>
                      <input
                        type="tel"
                        id="patientPhone"
                        name="patientPhone"
                        value={formData.patientPhone}
                        onChange={handleInputChange}
                        className={`h-9 w-full rounded-md border px-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 ${
                          errors.patientPhone ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder={t('appointments.placeholders.patientPhone')}
                      />
                      {errors.patientPhone && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.patientPhone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Appointment Details Tab */}
            {activeTab === 'appointment' && (
              <div className="space-y-3">
                <div className="mb-2 flex items-center gap-2">
                  <Calendar className="h-5 w-5 shrink-0 text-green-600" />
                  <h2 className="text-base font-semibold text-gray-900">{t('appointments.tabs.appointmentDetails')}</h2>
                </div>
                
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                  <div>
                    <label htmlFor="doctorName" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                      {t('appointments.doctorName')} *
                    </label>
                    <SearchableDoctorSelect
                      value={formData.doctorName}
                      onChange={handleDoctorSelect}
                      placeholder={t('appointments.placeholders.selectDoctor') || 'Select a doctor'}
                      disabled={session?.user?.role === 'doctor'}
                      className={errors.doctorName ? 'border-red-300' : ''}
                    />
                    {errors.doctorName && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.doctorName}
                      </p>
                    )}
                    
                    {/* Doctor Details Card */}
                    {selectedDoctor && (
                      <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 p-3">
                        <div className="flex items-start gap-2">
                          <div className="shrink-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                              <Stethoscope className="h-4 w-4 text-blue-600" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="mb-1 text-xs font-semibold text-gray-900 sm:text-sm">
                              {selectedDoctor.name}
                            </h4>
                            <div className="space-y-1.5 text-xs text-gray-600">
                              <div className="flex items-center">
                                <Mail className="h-3 w-3 mr-2 text-gray-400 flex-shrink-0" />
                                <span className="truncate">{selectedDoctor.email}</span>
                              </div>
                              {selectedDoctor.qualifications && selectedDoctor.qualifications.length > 0 && (
                                <div className="flex items-start">
                                  <Award className="h-3 w-3 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
                                  <div className="flex flex-wrap gap-1">
                                    {selectedDoctor.qualifications.map((qual, index) => (
                                      <span key={index} className="inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-medium">
                                        {qual}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {selectedDoctor.specialization && (
                                <div className="flex items-center">
                                  <GraduationCap className="h-3 w-3 mr-2 text-gray-400 flex-shrink-0" />
                                  <span className="truncate">{selectedDoctor.specialization}</span>
                                </div>
                              )}
                              {selectedDoctor.department && (
                                <div className="flex items-center">
                                  <Building className="h-3 w-3 mr-2 text-gray-400 flex-shrink-0" />
                                  <span className="truncate">{selectedDoctor.department}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="appointmentType" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                      {t('appointments.appointmentType')}
                    </label>
                    <select
                      id="appointmentType"
                      name="appointmentType"
                      value={formData.appointmentType}
                      onChange={handleInputChange}
                      className="h-9 w-full rounded-md border border-gray-300 px-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    >
                      {appointmentTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="max-w-md md:col-span-2">
                    <label htmlFor="appointmentDate" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                      {t('appointments.appointmentDate')} *
                    </label>
                    <input
                      type="date"
                      id="appointmentDate"
                      name="appointmentDate"
                      value={formData.appointmentDate}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                      className={`h-9 w-full rounded-md border px-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 ${
                        errors.appointmentDate ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.appointmentDate && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.appointmentDate}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1 flex items-center gap-2 text-xs font-medium text-gray-700 sm:text-sm">
                      <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                      {t('appointments.appointmentTime')} *
                    </label>

                    {!doctorIdLooksValid(selectedDoctor?._id) ? (
                      <>
                        <p className="text-xs text-gray-500 mb-2">
                          {t('appointments.slotsSelectDoctorFirst')}
                        </p>
                        <input
                          type="time"
                          id="appointmentTime"
                          name="appointmentTime"
                          value={formData.appointmentTime}
                          onChange={handleInputChange}
                          className={`h-9 max-w-xs w-full rounded-md border px-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 ${
                            errors.appointmentTime ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                      </>
                    ) : !formData.appointmentDate ? (
                      <p className="text-sm text-gray-500">{t('appointments.slotsPickDateFirst')}</p>
                    ) : slotsLoading ? (
                      <div className="flex items-center gap-2 py-2 text-xs text-gray-500 sm:text-sm">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                        {t('appointments.loadingSlots')}
                      </div>
                    ) : daySlots.length > 0 ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-6 sm:gap-2">
                          {daySlots.map((slot) => (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={!slot.available}
                              onClick={() => {
                                if (!slot.available) return;
                                setFormData((prev) => ({ ...prev, appointmentTime: slot.time }));
                                if (errors.appointmentTime) {
                                  setErrors((prev) => ({ ...prev, appointmentTime: '' }));
                                }
                              }}
                              className={`rounded-md border px-1.5 py-1.5 text-xs font-medium transition-colors sm:px-2 sm:py-2 sm:text-sm ${
                                formData.appointmentTime === slot.time
                                  ? 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-200'
                                  : slot.available
                                    ? 'border-gray-200 bg-white text-gray-900 hover:border-blue-300 hover:bg-blue-50/50'
                                    : 'border-gray-100 bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                              }`}
                              title={
                                slot.available
                                  ? t('appointments.slotsLegendAvailable')
                                  : t('appointments.slotsLegendBooked')
                              }
                            >
                              {slot.time}
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-sm bg-white border border-gray-200" />
                            {t('appointments.slotsLegendAvailable')}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-sm bg-gray-100 border border-gray-100" />
                            {t('appointments.slotsLegendBooked')}
                          </span>
                        </div>
                        <details className="text-sm">
                          <summary className="cursor-pointer text-gray-600 hover:text-gray-900 select-none">
                            {t('appointments.manualTimeOverride')}
                          </summary>
                          <input
                            type="time"
                            id="appointmentTime"
                            name="appointmentTime"
                            value={formData.appointmentTime}
                            onChange={handleInputChange}
                            className="mt-2 h-9 max-w-xs w-full rounded-md border border-gray-300 px-2 text-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </details>
                      </div>
                    ) : slotsLoaded ? (
                      <div className="space-y-2">
                        <p className="rounded-md border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 sm:text-sm">
                          {t('appointments.noSlotsThisDay')}
                        </p>
                        <input
                          type="time"
                          id="appointmentTime"
                          name="appointmentTime"
                          value={formData.appointmentTime}
                          onChange={handleInputChange}
                          className={`h-9 max-w-xs w-full rounded-md border px-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 ${
                            errors.appointmentTime ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                      </div>
                    ) : null}

                    {errors.appointmentTime && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1 shrink-0" />
                        {errors.appointmentTime}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="status" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                      {t('appointments.status')}
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="h-9 w-full rounded-md border border-gray-300 px-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    >
                      {statusOptions.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="location" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                      {t('appointments.location') || 'Location'}
                    </label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="h-9 w-full rounded-md border border-gray-300 px-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      placeholder={t('appointments.placeholders.location') || 'e.g., Room 101, Building A'}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Additional Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-3">
                <div className="mb-2 flex items-center gap-2">
                  <FileText className="h-5 w-5 shrink-0 text-purple-600" />
                  <h2 className="text-base font-semibold text-gray-900">{t('appointments.tabs.additionalInfo')}</h2>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label htmlFor="reason" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                      {t('appointments.reason')} *
                    </label>
                    <textarea
                      id="reason"
                      name="reason"
                      value={formData.reason}
                      onChange={handleInputChange}
                      rows={3}
                      className={`w-full rounded-md border px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 ${
                        errors.reason ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder={t('appointments.placeholders.reason')}
                    />
                    {errors.reason && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.reason}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="notes" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                      {t('appointments.notes')}
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      placeholder={t('appointments.placeholders.notes')}
                    />
                  </div>

                  {/* Video Call Toggle Section */}
                  <div className="border-t border-gray-100 pt-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Video className="h-4 w-4 shrink-0 text-indigo-600" />
                        <h3 className="text-sm font-medium text-gray-900">
                          {t('appointments.videoCall.title') || 'Video Consultation'}
                        </h3>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.includeVideoCall}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            includeVideoCall: e.target.checked
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        <span className="ms-2 text-xs font-medium text-gray-700 sm:ms-3 sm:text-sm">
                          {t('appointments.videoCall.include') || 'Include Video Call'}
                        </span>
                      </label>
                    </div>
                    
                    <p className="mb-2 text-xs text-gray-500 sm:text-sm">
                      {t('appointments.videoCall.description') || 'Enable this to create a video consultation session that the patient can join remotely.'}
                    </p>

                    {formData.includeVideoCall && (
                      <div className="space-y-3 rounded-md border border-indigo-200 bg-indigo-50 p-3">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                              {t('appointments.videoCall.consultationType') || 'Consultation Type'}
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                { value: 'video', icon: Video, label: t('appointments.videoCall.types.video') || 'Video' },
                                { value: 'audio', icon: Mic, label: t('appointments.videoCall.types.audio') || 'Audio' },
                                { value: 'chat', icon: MessageCircle, label: t('appointments.videoCall.types.chat') || 'Chat' }
                              ].map((type) => (
                                <button
                                  key={type.value}
                                  type="button"
                                  onClick={() => setFormData(prev => ({
                                    ...prev,
                                    consultationType: type.value as 'video' | 'audio' | 'chat'
                                  }))}
                                  className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:gap-2 sm:px-3 sm:text-sm ${
                                    formData.consultationType === type.value
                                      ? 'bg-indigo-600 text-white'
                                      : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  <type.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  {type.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                              {t('appointments.videoCall.duration') || 'Session Duration'}
                            </label>
                            <select
                              value={formData.sessionDuration}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                sessionDuration: parseInt(e.target.value)
                              }))}
                              className="h-9 w-full rounded-md border border-gray-300 px-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value={15}>15 {t('common.minutes') || 'minutes'}</option>
                              <option value={30}>30 {t('common.minutes') || 'minutes'}</option>
                              <option value={45}>45 {t('common.minutes') || 'minutes'}</option>
                              <option value={60}>60 {t('common.minutes') || 'minutes'}</option>
                              <option value={90}>90 {t('common.minutes') || 'minutes'}</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 rounded-md bg-indigo-100 p-2 text-xs text-indigo-800 sm:text-sm">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <p>
                            {t('appointments.videoCall.note') || 'A video consultation link will be created and the patient will be able to join 15 minutes before the scheduled time.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Review Tab */}
            {activeTab === 'review' && (
              <div className="space-y-3">
                <div className="mb-2 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
                  <h2 className="text-base font-semibold text-gray-900">{t('appointments.tabs.review')}</h2>
                </div>
                
                <div className="space-y-3 rounded-md border border-gray-100 bg-gray-50 p-3 sm:p-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                    <div>
                      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-600 sm:text-sm sm:normal-case">{t('appointments.patientInformation')}</h3>
                      <div className="space-y-1 text-xs text-gray-700 sm:text-sm">
                        <p className="text-gray-700"><span className="font-medium text-gray-900">Name:</span> {formData.patientName || 'Not provided'}</p>
                        <p className="text-gray-700"><span className="font-medium text-gray-900">Email:</span> {formData.patientEmail || 'Not provided'}</p>
                        <p className="text-gray-700"><span className="font-medium text-gray-900">Phone:</span> {formData.patientPhone || 'Not provided'}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-600 sm:text-sm sm:normal-case">{t('appointments.appointmentDetails')}</h3>
                      <div className="space-y-1 text-xs text-gray-700 sm:text-sm">
                        <p className="text-gray-700"><span className="font-medium text-gray-900">Doctor:</span> {formData.doctorName || 'Not provided'}</p>
                        <p className="text-gray-700"><span className="font-medium text-gray-900">Type:</span> {appointmentTypes.find(t => t.value === formData.appointmentType)?.label || 'Not selected'}</p>
                        <p className="text-gray-700"><span className="font-medium text-gray-900">Date:</span> {formData.appointmentDate || 'Not selected'}</p>
                        <p className="text-gray-700"><span className="font-medium text-gray-900">Time:</span> {formData.appointmentTime || 'Not selected'}</p>
                        <p className="text-gray-700"><span className="font-medium text-gray-900">Status:</span> {statusOptions.find(s => s.value === formData.status)?.label || 'Not selected'}</p>
                        {formData.location && (
                          <p className="text-gray-700"><span className="font-medium text-gray-900">{t('appointments.location') || 'Location'}:</span> {formData.location}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {formData.reason && (
                    <div>
                      <h3 className="mb-0.5 text-xs font-semibold text-gray-800">{t('appointments.reason')}</h3>
                      <p className="text-xs text-gray-600 sm:text-sm">{formData.reason}</p>
                    </div>
                  )}
                  
                  {formData.notes && (
                    <div>
                      <h3 className="mb-0.5 text-xs font-semibold text-gray-800">{t('appointments.notes')}</h3>
                      <p className="text-xs text-gray-600 sm:text-sm">{formData.notes}</p>
                    </div>
                  )}

                  {/* Video Call Summary */}
                  {formData.includeVideoCall && (
                    <div className="mt-2 border-t border-gray-200 pt-3">
                      <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                        <Video className="h-3.5 w-3.5 text-indigo-600" />
                        {t('appointments.videoCall.title') || 'Video Consultation'}
                      </h3>
                      <div className="space-y-1 rounded-md bg-indigo-50 p-2.5 text-xs sm:text-sm">
                        <p className="text-gray-700">
                          <span className="font-medium text-gray-900">{t('appointments.videoCall.consultationType') || 'Type'}:</span>{' '}
                          {formData.consultationType === 'video' 
                            ? (t('appointments.videoCall.types.video') || 'Video Call')
                            : formData.consultationType === 'audio'
                            ? (t('appointments.videoCall.types.audio') || 'Audio Call')
                            : (t('appointments.videoCall.types.chat') || 'Chat')
                          }
                        </p>
                        <p className="text-gray-700">
                          <span className="font-medium text-gray-900">{t('appointments.videoCall.duration') || 'Duration'}:</span>{' '}
                          {formData.sessionDuration} {t('common.minutes') || 'minutes'}
                        </p>
                        <p className="text-indigo-600 text-xs mt-2">
                          {t('appointments.videoCall.willBeCreated') || 'A video session will be created automatically when this appointment is saved.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            </div>

            {/* Tab Navigation Buttons */}
            <div className="mt-3 flex flex-wrap justify-between gap-2">
            <div>
              {activeTab !== 'patient' && (
                <button
                  type="button"
                  onClick={prevTab}
                  className="h-9 rounded-md border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {t('common.previous')}
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="h-9 rounded-md border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              
              {activeTab !== 'review' ? (
                <button
                  type="button"
                  onClick={nextTab}
                  disabled={!isTabValid(activeTab)}
                  className="h-9 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t('common.next')}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => {
                    e.preventDefault();
                    handleSubmit(e as unknown as React.FormEvent);
                  }}
                  className="inline-flex h-9 items-center rounded-md bg-green-600 px-3 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                      {t('appointments.creating')}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {t('appointments.createAppointment')}
                    </>
                  )}
                </button>
               )}
             </div>
           </div>
         </form>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}