'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Pill,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle,
  Calendar,
} from 'lucide-react';
import SidebarLayout from '../../../../components/sidebar-layout';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface Session {
  _id: string;
  sessionNumber: string;
  patientId: {
    _id: string;
    name: string;
    patientId: string;
    dateOfBirth?: string;
  };
  doctorId: {
    _id: string;
    name: string;
    specialization?: string;
  };
  diagnosis?: string;
  symptoms?: string[];
  clinicalNotes?: string;
}

export default function PrescriptionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [diagnosis, setDiagnosis] = useState('');
  const [findings, setFindings] = useState('');
  const [medications, setMedications] = useState<Medication[]>([
    { name: '', dosage: '', frequency: '', duration: '', instructions: '' }
  ]);
  const [recommendations, setRecommendations] = useState<string[]>(['']);
  const [followUpDate, setFollowUpDate] = useState('');

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/telemedicine/sessions/${sessionId}`);
      if (!res.ok) throw new Error('Failed to fetch session');
      const data = await res.json();
      setSession(data);
      
      // Pre-fill from session data
      if (data.diagnosis) setDiagnosis(data.diagnosis);
      if (data.clinicalNotes) setFindings(data.clinicalNotes);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addMedication = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  };

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };

  const removeMedication = (index: number) => {
    if (medications.length > 1) {
      setMedications(medications.filter((_, i) => i !== index));
    }
  };

  const addRecommendation = () => {
    setRecommendations([...recommendations, '']);
  };

  const updateRecommendation = (index: number, value: string) => {
    const updated = [...recommendations];
    updated[index] = value;
    setRecommendations(updated);
  };

  const removeRecommendation = (index: number) => {
    if (recommendations.length > 1) {
      setRecommendations(recommendations.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // Filter out empty medications and recommendations
      const validMedications = medications.filter(m => m.name.trim());
      const validRecommendations = recommendations.filter(r => r.trim());

      const res = await fetch(`/api/telemedicine/sessions/${sessionId}/prescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosis,
          findings,
          medications: validMedications,
          recommendations: validRecommendations,
          followUpDate: followUpDate || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create prescription');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/telemedicine/sessions/${sessionId}`);
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout dense>
        <div className="flex h-48 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
        </div>
      </SidebarLayout>
    );
  }

  if (!session) {
    return (
      <SidebarLayout dense>
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <p className="text-sm text-gray-600">Session not found</p>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout dense>
      <div className="min-h-screen bg-gray-50 p-4">
        {/* Header */}
        <div className="mb-4">
          <Link
            href={`/telemedicine/sessions/${sessionId}`}
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Session
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
              <Pill className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Create Prescription</h1>
              <p className="text-xs text-gray-600">Session: {session.sessionNumber}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
            <span>Prescription created successfully! Redirecting...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="max-w-4xl">
          {/* Patient Info */}
          <div className="mb-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Patient Information</h2>
            <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
              <div>
                <p className="text-gray-500">Patient Name</p>
                <p className="font-medium text-gray-900">
                  {session.patientId.name}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Patient ID</p>
                <p className="font-medium text-gray-900">{session.patientId.patientId}</p>
              </div>
              <div>
                <p className="text-gray-500">Doctor</p>
                <p className="font-medium text-gray-900">Dr. {session.doctorId.name}</p>
              </div>
            </div>
            {session.symptoms && session.symptoms.length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">Symptoms</p>
                <div className="flex flex-wrap gap-1.5">
                  {session.symptoms.map((symptom, i) => (
                    <span key={i} className="rounded-md bg-orange-100 px-2 py-0.5 text-xs text-orange-800">
                      {symptom}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Diagnosis */}
          <div className="mb-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Diagnosis</h2>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Enter diagnosis..."
              className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          {/* Clinical Findings */}
          <div className="mb-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Clinical Findings</h2>
            <textarea
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              placeholder="Enter clinical findings..."
              rows={4}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Medications */}
          <div className="mb-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Medications</h2>
              <button
                type="button"
                onClick={addMedication}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Medication
              </button>
            </div>
            <div className="space-y-3">
              {medications.map((medication, index) => (
                <div key={index} className="rounded-md border border-gray-100 bg-gray-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">Medication {index + 1}</span>
                    {medications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMedication(index)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-0.5 block text-[10px] font-medium text-gray-500">Medicine Name</label>
                      <input
                        type="text"
                        value={medication.name}
                        onChange={(e) => updateMedication(index, 'name', e.target.value)}
                        placeholder="e.g., Amoxicillin"
                        className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] font-medium text-gray-500">Dosage</label>
                      <input
                        type="text"
                        value={medication.dosage}
                        onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                        placeholder="e.g., 500mg"
                        className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] font-medium text-gray-500">Frequency</label>
                      <select
                        value={medication.frequency}
                        onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                        className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-xs"
                      >
                        <option value="">Select frequency</option>
                        <option value="Once daily">Once daily</option>
                        <option value="Twice daily">Twice daily</option>
                        <option value="Three times daily">Three times daily</option>
                        <option value="Four times daily">Four times daily</option>
                        <option value="Every 4 hours">Every 4 hours</option>
                        <option value="Every 6 hours">Every 6 hours</option>
                        <option value="Every 8 hours">Every 8 hours</option>
                        <option value="As needed">As needed</option>
                        <option value="Before meals">Before meals</option>
                        <option value="After meals">After meals</option>
                        <option value="At bedtime">At bedtime</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] font-medium text-gray-500">Duration</label>
                      <input
                        type="text"
                        value={medication.duration}
                        onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                        placeholder="e.g., 7 days"
                        className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="mb-0.5 block text-[10px] font-medium text-gray-500">Instructions</label>
                      <input
                        type="text"
                        value={medication.instructions}
                        onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                        placeholder="e.g., Take with food"
                        className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="mb-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Recommendations</h2>
              <button
                type="button"
                onClick={addRecommendation}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
            <div className="space-y-2">
              {recommendations.map((rec, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={rec}
                    onChange={(e) => updateRecommendation(index, e.target.value)}
                    placeholder="e.g., Rest for 3 days, Drink plenty of fluids..."
                    className="h-9 flex-1 rounded-md border border-gray-200 px-3 text-sm"
                  />
                  {recommendations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRecommendation(index)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Follow-up */}
          <div className="mb-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Follow-up</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="h-9 rounded-md border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-500">Optional follow-up date</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <Link
              href={`/telemedicine/sessions/${sessionId}`}
              className="inline-flex h-9 items-center px-3 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-green-600 px-4 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Create Prescription'}
            </button>
          </div>
        </form>
      </div>
    </SidebarLayout>
  );
}
