'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  Calendar, 
  Clock,
  Users,
  MapPin,
  FileText,
  AlertCircle,
  CheckCircle,
  LayoutGrid
} from 'lucide-react';
import ProtectedRoute from '../../../protected-route';
import SidebarLayout from '../../../components/sidebar-layout';
import SearchableDoctorSelect from '../../../components/SearchableDoctorSelect';
import { useTranslations } from '../../../hooks/useTranslations';

interface Doctor {
  _id: string;
  name: string;
  email: string;
  role?: string;
}

function normalizeDoctorId(raw: unknown): string {
  if (raw == null || raw === '') return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw !== null && '$oid' in raw) {
    return String((raw as { $oid: string }).$oid);
  }
  try {
    return String(raw);
  } catch {
    return '';
  }
}

const doctorIdLooksValid = (id: string | undefined) =>
  !!id && /^[a-f0-9]{24}$/i.test(id.trim());

export default function AppointmentEditPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { t } = useTranslations();
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [daySlots, setDaySlots] = useState<{ time: string; available: boolean }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsLoaded, setSlotsLoaded] = useState(false);

  const [formData, setFormData] = useState({
    patientName: '',
    patientEmail: '',
    patientPhone: '',
    doctorName: '',
    doctorEmail: '',
    appointmentDate: '',
    appointmentTime: '',
    appointmentType: '',
    status: '',
    location: '',
    notes: '',
    symptoms: [] as string[],
    diagnosis: '',
    treatment: ''
  });

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const response = await fetch(`/api/appointments/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setAppointment(data);
          const dateStr = data.appointmentDate
            ? String(data.appointmentDate).split('T')[0]
            : '';
          setFormData({
            patientName: data.patientName || '',
            patientEmail: data.patientEmail || '',
            patientPhone: data.patientPhone || '',
            doctorName: data.doctorName || '',
            doctorEmail: data.doctorEmail || '',
            appointmentDate: dateStr,
            appointmentTime: data.appointmentTime || '',
            appointmentType: data.appointmentType || '',
            status: data.status || '',
            location: data.location || '',
            notes: data.notes || '',
            symptoms: data.symptoms || [],
            diagnosis: data.diagnosis || '',
            treatment: data.treatment || ''
          });

          const fromId = normalizeDoctorId(data.doctorId);
          if (fromId) {
            setSelectedDoctor({
              _id: fromId,
              name: data.doctorName || '',
              email: data.doctorEmail || '',
              role: 'doctor'
            });
          } else if (data.doctorName) {
            setSelectedDoctor({
              _id: '',
              name: data.doctorName,
              email: data.doctorEmail || '',
              role: 'doctor'
            });
          }
        } else {
          setError('Appointment not found');
        }
      } catch (error) {
        console.error('Error fetching appointment:', error);
        setError('Failed to fetch appointment data');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchAppointment();
    }
  }, [params.id]);

  useEffect(() => {
    if (session?.user?.role !== 'doctor' || !session.user?.id) return;
    setSelectedDoctor((prev) => ({
      _id: session.user.id!,
      name: session.user.name || prev?.name || '',
      email: session.user.email || prev?.email || '',
      role: 'doctor'
    }));
  }, [session?.user?.role, session?.user?.id, session?.user?.name, session?.user?.email]);

  const appointmentIdStr = typeof params.id === 'string' ? params.id : params.id?.[0] ?? '';

  useEffect(() => {
    const doctorId = selectedDoctor?._id?.trim();
    const date = formData.appointmentDate;
    if (!doctorIdLooksValid(doctorId) || !date || !appointmentIdStr) {
      setDaySlots([]);
      setSlotsLoaded(false);
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    setSlotsLoaded(false);
    const q = new URLSearchParams({
      doctorId: doctorId!,
      date,
      excludeAppointmentId: appointmentIdStr,
    });
    fetch(`/api/appointments/slots?${q}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setDaySlots(Array.isArray(data.slots) ? data.slots : []);
        setSlotsLoaded(true);
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
  }, [selectedDoctor?._id, formData.appointmentDate, appointmentIdStr]);

  // Handle doctor selection
  const handleDoctorSelect = (doctor: Doctor | null) => {
    setSelectedDoctor(doctor);
    if (doctor) {
      setFormData(prev => ({
        ...prev,
        doctorName: doctor.name,
        doctorEmail: doctor.email,
        appointmentTime: ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        doctorName: '',
        doctorEmail: '',
        appointmentTime: ''
      }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'appointmentDate') {
      setFormData(prev => ({
        ...prev,
        appointmentDate: value,
        appointmentTime: ''
      }));
      if (error) setError('');
      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (error) setError('');
  };

  const handleSymptomsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const symptoms = e.target.value.split(',').map(s => s.trim()).filter(s => s);
    setFormData(prev => ({
      ...prev,
      symptoms
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...formData,
        ...(doctorIdLooksValid(selectedDoctor?._id)
          ? { doctorId: selectedDoctor!._id.trim() }
          : {}),
      };
      const response = await fetch(`/api/appointments/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSuccess('Appointment updated successfully!');
        setTimeout(() => {
          router.push(`/appointments/${params.id}`);
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update appointment');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Error updating appointment:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout title="Edit Appointment" description="Modify appointment" dense>
          <div className="flex min-h-[240px] items-center justify-center">
            <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-blue-600"></div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout title="Edit Appointment" description="Modify appointment" dense>
        <div className="mx-auto max-w-4xl space-y-3">
          <div className="mb-1">
            <Link href={`/appointments/${params.id}`} className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 sm:text-sm">
              <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Back to Appointment
            </Link>
            <h1 className="mt-1 text-lg font-bold text-gray-900 sm:text-xl">
              Edit Appointment: {appointment?.patientName}
            </h1>
          </div>
          
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2.5">
              <div className="flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-md border border-green-200 bg-green-50 p-2.5">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                <span>{success}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">Patient Information</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                <div>
                  <label htmlFor="patientName" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    Patient Name *
                  </label>
                  <input
                    type="text"
                    id="patientName"
                    name="patientName"
                    value={formData.patientName}
                    onChange={handleInputChange}
                    required
                    className="h-9 w-full rounded-md border border-gray-300 px-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="patientEmail" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    Patient Email *
                  </label>
                  <input
                    type="email"
                    id="patientEmail"
                    name="patientEmail"
                    value={formData.patientEmail}
                    onChange={handleInputChange}
                    required
                    className="h-9 w-full rounded-md border border-gray-300 px-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="patientPhone" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    Patient Phone *
                  </label>
                  <input
                    type="tel"
                    id="patientPhone"
                    name="patientPhone"
                    value={formData.patientPhone}
                    onChange={handleInputChange}
                    required
                    className="h-9 w-full rounded-md border border-gray-300 px-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">Doctor Information</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                <div>
                  <label htmlFor="doctorName" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    Doctor Name *
                  </label>
                  <SearchableDoctorSelect
                    value={formData.doctorName}
                    onChange={handleDoctorSelect}
                    placeholder="Search and select a doctor..."
                    disabled={session?.user?.role === 'doctor'}
                  />
                </div>
                
                <div>
                  <label htmlFor="doctorEmail" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    Doctor Email
                  </label>
                  <input
                    type="email"
                    id="doctorEmail"
                    name="doctorEmail"
                    value={formData.doctorEmail}
                    onChange={handleInputChange}
                    readOnly
                    className="h-9 w-full rounded-md border border-gray-300 bg-gray-50 px-2.5 text-sm text-gray-600"
                  />
                  <p className="mt-0.5 text-[11px] text-gray-500">Auto-filled when doctor is selected</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">Appointment Details</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                <div>
                  <label htmlFor="appointmentDate" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    {t('appointments.appointmentDate')} *
                  </label>
                  <input
                    type="date"
                    id="appointmentDate"
                    name="appointmentDate"
                    value={formData.appointmentDate}
                    onChange={handleInputChange}
                    required
                    className="h-9 w-full rounded-md border border-gray-300 px-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-700 sm:text-sm">
                    <LayoutGrid className="h-3.5 w-3.5 text-gray-500" />
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
                        required
                        className="h-9 max-w-xs w-full rounded-md border border-gray-300 px-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                    </>
                  ) : !formData.appointmentDate ? (
                    <p className="text-sm text-gray-500">{t('appointments.slotsPickDateFirst')}</p>
                  ) : slotsLoading ||
                    (doctorIdLooksValid(selectedDoctor?._id) &&
                      formData.appointmentDate &&
                      !slotsLoaded) ? (
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
                          className="mt-2 w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </details>
                    </div>
                  ) : slotsLoaded ? (
                    <div className="space-y-3">
                      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        {t('appointments.noSlotsThisDay')}
                      </p>
                      <input
                        type="time"
                        id="appointmentTime"
                        name="appointmentTime"
                        value={formData.appointmentTime}
                        onChange={handleInputChange}
                        required
                        className="h-9 max-w-xs w-full rounded-md border border-gray-300 px-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ) : null}
                </div>
                
                <div>
                  <label htmlFor="appointmentType" className="block text-sm font-medium text-gray-700 mb-2">
                    Type *
                  </label>
                  <select
                    id="appointmentType"
                    name="appointmentType"
                    value={formData.appointmentType}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select appointment type</option>
                    <option value="consultation">Consultation</option>
                    <option value="follow-up">Follow-up</option>
                    <option value="examination">Examination</option>
                    <option value="procedure">Procedure</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select status</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Room 101, Building A"
                  />
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical Information</h3>
              <div className="space-y-6">
                <div>
                  <label htmlFor="symptoms" className="block text-sm font-medium text-gray-700 mb-2">
                    Symptoms
                  </label>
                  <input
                    type="text"
                    id="symptoms"
                    name="symptoms"
                    value={formData.symptoms.join(', ')}
                    onChange={handleSymptomsChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter symptoms separated by commas"
                  />
                  <p className="text-sm text-gray-500 mt-1">Separate multiple symptoms with commas</p>
                </div>
                
                <div>
                  <label htmlFor="diagnosis" className="block text-sm font-medium text-gray-700 mb-2">
                    Diagnosis
                  </label>
                  <textarea
                    id="diagnosis"
                    name="diagnosis"
                    value={formData.diagnosis}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter the diagnosis..."
                  />
                </div>
                
                <div>
                  <label htmlFor="treatment" className="block text-sm font-medium text-gray-700 mb-2">
                    Treatment
                  </label>
                  <textarea
                    id="treatment"
                    name="treatment"
                    value={formData.treatment}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter the treatment plan..."
                  />
                </div>
                
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Any additional notes..."
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4">
              <Link
                href={`/appointments/${params.id}`}
                className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
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
