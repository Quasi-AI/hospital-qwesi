'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Video,
  Phone,
  MessageCircle,
  ArrowLeft,
  Calendar,
  User,
  Stethoscope,
  DollarSign,
  FileText,
  AlertCircle,
} from 'lucide-react';
import SidebarLayout from '../../../components/sidebar-layout';
import { useFormatCurrency } from '../../../hooks/useFormatCurrency';

interface Patient {
  _id: string;
  name: string;
  patientId: string;
  email: string;
  phone: string;
}

interface Doctor {
  _id: string;
  name: string;
  specialization?: string;
  email: string;
  consultationFee?: number;
}

export default function NewSessionPage() {
  return (
    <Suspense
      fallback={
        <SidebarLayout title="Schedule New Session" description="Create a new telemedicine consultation" dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
          </div>
        </SidebarLayout>
      }
    >
      <NewSessionPageContent />
    </Suspense>
  );
}

function NewSessionPageContent() {
  const { formatCurrency } = useFormatCurrency();
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams.get('patientId');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    consultationType: 'video' as 'video' | 'audio' | 'chat',
    scheduledDate: '',
    scheduledTime: '',
    duration: 30,
    chiefComplaint: '',
    consultationFee: 0,
    notes: '',
  });

  useEffect(() => {
    fetchPatients();
    fetchDoctors();
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    setFormData(prev => ({ ...prev, scheduledDate: today }));
  }, []);

  useEffect(() => {
    if (!patientIdFromUrl || patients.length === 0) return;
    const match = patients.find((p) => p._id === patientIdFromUrl);
    if (!match) return;
    setFormData((prev) =>
      prev.patientId === patientIdFromUrl ? prev : { ...prev, patientId: patientIdFromUrl }
    );
    setPatientSearch(match.name);
  }, [patientIdFromUrl, patients]);

  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/patients?limit=100');
      if (res.ok) {
        const data = await res.json();
        // API returns array directly, not wrapped in { patients: [...] }
        setPatients(Array.isArray(data) ? data : (data.patients || []));
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchDoctors = async () => {
    try {
      // Fetch doctors from /api/doctors endpoint
      const res = await fetch('/api/doctors');
      if (res.ok) {
        const data = await res.json();
        // API returns array directly
        const doctorsList = Array.isArray(data) ? data : (data.doctors || []);
        setDoctors(doctorsList);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const handleDoctorSelect = (doctorId: string) => {
    const doctor = doctors.find(d => d._id === doctorId);
    setFormData(prev => ({
      ...prev,
      doctorId,
      consultationFee: doctor?.consultationFee || prev.consultationFee,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate
      if (!formData.patientId || !formData.doctorId) {
        throw new Error('Please select both patient and doctor');
      }
      if (!formData.scheduledDate || !formData.scheduledTime) {
        throw new Error('Please set scheduled date and time');
      }

      // Build scheduled times
      const scheduledStartTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
      const scheduledEndTime = new Date(scheduledStartTime.getTime() + formData.duration * 60 * 1000);

      const payload = {
        patientId: formData.patientId,
        doctorId: formData.doctorId,
        consultationType: formData.consultationType,
        scheduledStartTime: scheduledStartTime.toISOString(),
        scheduledEndTime: scheduledEndTime.toISOString(),
        chiefComplaint: formData.chiefComplaint,
        consultationFee: formData.consultationFee,
        doctorNotes: formData.notes,
      };

      const res = await fetch('/api/telemedicine/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create session');
      }

      const session = await res.json();
      router.push(`/telemedicine/sessions/${session._id}`);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(p => {
    if (!p || !p.name) return false;
    const search = patientSearch.toLowerCase();
    return (
      (p.name?.toLowerCase() || '').includes(search) ||
      (p.patientId?.toLowerCase() || '').includes(search) ||
      (p.email?.toLowerCase() || '').includes(search)
    );
  });

  const filteredDoctors = doctors.filter(d => {
    if (!d || !d.name) return false;
    const search = doctorSearch.toLowerCase();
    return (
      (d.name?.toLowerCase() || '').includes(search) ||
      (d.specialization?.toLowerCase() || '').includes(search)
    );
  });

  return (
    <SidebarLayout title="Schedule New Session" description="Create a new telemedicine consultation" dense>
      <div className="space-y-4">
        <Link
          href="/telemedicine"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Telemedicine
        </Link>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="max-w-4xl space-y-4">
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Consultation Type</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                { type: 'video', icon: Video, label: 'Video Call', desc: 'Face-to-face video consultation' },
                { type: 'audio', icon: Phone, label: 'Audio Call', desc: 'Voice-only consultation' },
                { type: 'chat', icon: MessageCircle, label: 'Chat', desc: 'Text-based consultation' },
              ].map(({ type, icon: Icon, label, desc }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, consultationType: type as any }))}
                  className={`rounded-md border-2 p-3 text-left transition-all ${
                    formData.consultationType === type
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <Icon className={`mb-1.5 h-6 w-6 ${
                    formData.consultationType === type ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Patient Selection */}
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-900">
                <User className="h-3.5 w-3.5 text-blue-600" />
                Select Patient
              </h2>
              <input
                type="text"
                placeholder="Search patients..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="mb-2 h-8 w-full rounded-md border border-gray-200 px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="max-h-52 space-y-1 overflow-y-auto">
                {filteredPatients.map(patient => (
                  <button
                    key={patient._id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, patientId: patient._id }))}
                    className={`w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
                      formData.patientId === patient._id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-medium leading-tight text-gray-900">{patient.name}</p>
                    <p className="text-[11px] text-gray-500">{patient.patientId}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Doctor Selection */}
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-900">
                <Stethoscope className="h-3.5 w-3.5 text-green-600" />
                Select Doctor
              </h2>
              <input
                type="text"
                placeholder="Search doctors..."
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                className="mb-2 h-8 w-full rounded-md border border-gray-200 px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="max-h-52 space-y-1 overflow-y-auto">
                {filteredDoctors.map(doctor => (
                  <button
                    key={doctor._id}
                    type="button"
                    onClick={() => handleDoctorSelect(doctor._id)}
                    className={`w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
                      formData.doctorId === doctor._id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-medium leading-tight text-gray-900">Dr. {doctor.name}</p>
                    <p className="text-[11px] text-gray-500">{doctor.specialization || 'General'}</p>
                    {doctor.consultationFee != null && (
                      <p className="text-[11px] text-green-600">{formatCurrency(doctor.consultationFee)}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <Calendar className="h-4 w-4 text-purple-600" />
              Schedule
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Time</label>
                <input
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                  className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Duration</label>
                <select
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                </select>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <FileText className="h-4 w-4 text-orange-600" />
              Additional Details
            </h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Chief Complaint</label>
                <input
                  type="text"
                  value={formData.chiefComplaint}
                  onChange={(e) => setFormData(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                  placeholder="e.g., Follow-up consultation, New symptoms..."
                  className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Consultation Fee (USD)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      value={formData.consultationFee}
                      onChange={(e) => setFormData(prev => ({ ...prev, consultationFee: parseFloat(e.target.value) || 0 }))}
                      className="h-9 w-full rounded-md border border-gray-200 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes for this session..."
                  rows={3}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-2">
            <Link
              href="/telemedicine"
              className="inline-flex h-9 items-center px-3 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-9 items-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Schedule Session'}
            </button>
          </div>
        </form>
      </div>
    </SidebarLayout>
  );
}
