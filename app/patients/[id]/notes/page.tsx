'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle,
  Download,
  FileText,
  Save,
  Share2,
  Stethoscope,
  Trash2,
} from 'lucide-react';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';

const RED_FLAGS = [
  ['chestPain', 'Chest pain'],
  ['difficultyBreathing', 'Difficulty breathing'],
  ['severeBleeding', 'Severe bleeding'],
  ['lossOfConsciousness', 'Loss of consciousness'],
  ['seizure', 'Seizure'],
  ['strokeSymptoms', 'Stroke symptoms'],
  ['pregnancyBleeding', 'Pregnancy bleeding'],
  ['severeAbdominalPain', 'Severe abdominal pain'],
  ['suicidalThoughts', 'Suicidal thoughts'],
  ['severeDehydration', 'Severe dehydration'],
  ['majorTrauma', 'Major trauma'],
] as const;

const initialForm = {
  noteType: 'full-soap',
  encounterType: 'video',
  encounterDate: new Date().toISOString().slice(0, 16),
  chiefComplaint: '',
  subjective: '',
  objective: '',
  assessment: '',
  plan: '',
  triageLevel: 'green',
  followUpPlan: '',
  emergencyPrecautions:
    'Patient advised to seek emergency care if symptoms worsen, difficulty breathing, chest pain, fainting, severe weakness, severe bleeding, confusion, seizure, persistent vomiting, pregnancy bleeding, severe abdominal pain, suicidal thoughts, or any other danger sign occurs.',
  patientUnderstanding: true,
  consentForVirtualCare: true,
  redFlags: {} as Record<string, boolean | string>,
  sharedWith: [] as string[],
};

function formatDate(value: string | Date) {
  return new Date(value).toLocaleString();
}

export default function PatientClinicalNotesPage() {
  const params = useParams();
  const patientId = String(params.id);
  const [patient, setPatient] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const selectedShareNames = useMemo(() => {
    return doctors
      .filter((doctor) => form.sharedWith.includes(doctor._id))
      .map((doctor) => doctor.name)
      .join(', ');
  }, [doctors, form.sharedWith]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [patientRes, notesRes, doctorsRes] = await Promise.all([
        fetch(`/api/patients/${patientId}`),
        fetch(`/api/clinical-notes?patientId=${patientId}`),
        fetch('/api/doctors'),
      ]);
      if (patientRes.ok) setPatient(await patientRes.json());
      if (notesRes.ok) setNotes((await notesRes.json()).notes || []);
      if (doctorsRes.ok) setDoctors(await doctorsRes.json());
      setLoading(false);
    }
    if (patientId) load();
  }, [patientId]);

  const update = (patch: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...patch }));

  const toggleRedFlag = (key: string, checked: boolean) => {
    setForm((prev) => ({ ...prev, redFlags: { ...prev.redFlags, [key]: checked } }));
  };

  const toggleShare = (id: string, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      sharedWith: checked ? [...prev.sharedWith, id] : prev.sharedWith.filter((x) => x !== id),
    }));
  };

  const refreshNotes = async () => {
    const res = await fetch(`/api/clinical-notes?patientId=${patientId}`);
    if (res.ok) setNotes((await res.json()).notes || []);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    const res = await fetch('/api/clinical-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, patientId }),
    });
    if (res.ok) {
      setForm(initialForm);
      await refreshNotes();
      setMessage('Clinical note saved.');
    } else {
      const error = await res.json().catch(() => ({}));
      setMessage(error.error || 'Failed to save clinical note.');
    }
    setSaving(false);
  };

  const downloadPdf = async (note: any) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const lines = [
      'Qwesi Virtual Hospital SOAP Note',
      `Note: ${note.noteNumber}`,
      `Patient: ${note.patientName} ${note.patientDisplayId ? `(${note.patientDisplayId})` : ''}`,
      `Encounter: ${formatDate(note.encounterDate)} - ${note.encounterType}`,
      `Provider: ${note.providerName} (${note.providerRole})`,
      `Chief complaint: ${note.chiefComplaint}`,
      '',
      'S - Subjective',
      note.subjective || 'Not documented',
      '',
      'O - Objective',
      note.objective || 'Not documented',
      '',
      'A - Assessment',
      note.assessment || 'Not documented',
      `Triage level: ${note.triageLevel}`,
      '',
      'P - Plan',
      note.plan || 'Not documented',
      '',
      'Follow-up plan',
      note.followUpPlan || 'Not documented',
      '',
      'Emergency precautions',
      note.emergencyPrecautions || 'Not documented',
      '',
      `Patient understanding: ${note.patientUnderstanding ? 'Yes' : 'No'}`,
      `Virtual care consent: ${note.consentForVirtualCare ? 'Yes' : 'No'}`,
      `Signed: ${note.providerName} - ${formatDate(note.createdAt)}`,
    ];

    let y = 48;
    doc.setFont('helvetica', 'normal');
    lines.forEach((line, index) => {
      doc.setFontSize(index === 0 ? 16 : 10);
      const wrapped = doc.splitTextToSize(line, 500);
      wrapped.forEach((part: string) => {
        if (y > 760) {
          doc.addPage();
          y = 48;
        }
        doc.text(part, 48, y);
        y += 15;
      });
      if (line === '') y += 4;
    });
    doc.save(`${note.noteNumber}.pdf`);
  };

  const deleteNote = async (note: any) => {
    if (!confirm(`Delete ${note.noteNumber}? This action cannot be undone.`)) return;
    setMessage('');
    const res = await fetch(`/api/clinical-notes?id=${encodeURIComponent(note._id)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setNotes((current) => current.filter((item) => item._id !== note._id));
      setMessage('Clinical note deleted.');
    } else {
      const error = await res.json().catch(() => ({}));
      setMessage(error.error || 'Failed to delete clinical note.');
    }
  };

  return (
    <ProtectedRoute>
      <SidebarLayout title="Clinical Notes" description="SOAP documentation for this patient" dense wide>
        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="space-y-4">
            <Link href={`/patients/${patientId}`} className="inline-flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900">
              <ArrowLeft className="h-4 w-4" />
              Back to patient
            </Link>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <Stethoscope className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">{patient?.name || 'Patient'}</h2>
                  <p className="text-sm text-slate-600">Use the Qwesi SOAP template for doctor consults, nurse triage, follow-ups, and referrals.</p>
                </div>
              </div>
            </div>

            {message ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{message}</div> : null}

            <form onSubmit={handleSave} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="text-sm font-medium text-slate-700">
                    Note type
                    <select value={form.noteType} onChange={(e) => update({ noteType: e.target.value })} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2">
                      <option value="full-soap">Full SOAP</option>
                      <option value="nurse-triage">Nurse triage</option>
                      <option value="doctor-telemedicine">Doctor telemedicine</option>
                      <option value="home-visit-follow-up">Home visit / follow-up</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Encounter type
                    <select value={form.encounterType} onChange={(e) => update({ encounterType: e.target.value })} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2">
                      <option value="phone">Phone</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="video">Video</option>
                      <option value="home-visit">Home visit</option>
                      <option value="facility-visit">Partner facility visit</option>
                      <option value="in-person">In person</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Date and time
                    <input type="datetime-local" value={form.encounterDate} onChange={(e) => update({ encounterDate: e.target.value })} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2" />
                  </label>
                </div>

                <label className="block text-sm font-medium text-slate-700">
                  Chief complaint
                  <input required value={form.chiefComplaint} onChange={(e) => update({ chiefComplaint: e.target.value })} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2" />
                </label>

                {[
                  ['subjective', 'S - Subjective'],
                  ['objective', 'O - Objective'],
                  ['assessment', 'A - Assessment'],
                  ['plan', 'P - Plan'],
                  ['followUpPlan', 'Follow-up plan'],
                  ['emergencyPrecautions', 'Emergency precautions'],
                ].map(([key, label]) => (
                  <label key={key} className="block text-sm font-medium text-slate-700">
                    {label}
                    <textarea value={(form as any)[key]} onChange={(e) => update({ [key]: e.target.value } as any)} rows={4} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2" />
                  </label>
                ))}
              </div>

              <aside className="space-y-4">
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <CheckCircle className="h-4 w-4 text-red-600" />
                    Red flag screening
                  </h3>
                  <div className="space-y-2">
                    {RED_FLAGS.map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={!!form.redFlags[key]} onChange={(e) => toggleRedFlag(key, e.target.checked)} />
                        {label}
                      </label>
                    ))}
                  </div>
                  <input
                    placeholder="Other urgent concern"
                    value={String(form.redFlags.other || '')}
                    onChange={(e) => setForm((prev) => ({ ...prev, redFlags: { ...prev.redFlags, other: e.target.value } }))}
                    className="mt-3 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <label className="text-sm font-medium text-slate-700">
                    Triage level
                    <select value={form.triageLevel} onChange={(e) => update({ triageLevel: e.target.value })} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2">
                      <option value="green">Green - Routine</option>
                      <option value="yellow">Yellow - Doctor review</option>
                      <option value="orange">Orange - Same-day care</option>
                      <option value="red">Red - Emergency</option>
                    </select>
                  </label>
                  <div className="mt-3 space-y-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={form.patientUnderstanding} onChange={(e) => update({ patientUnderstanding: e.target.checked })} />
                      Patient understood plan
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={form.consentForVirtualCare} onChange={(e) => update({ consentForVirtualCare: e.target.checked })} />
                      Consent for virtual care
                    </label>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <Share2 className="h-4 w-4 text-teal-700" />
                    Share with doctors
                  </h3>
                  <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                    {doctors.map((doctor) => (
                      <label key={doctor._id} className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={form.sharedWith.includes(doctor._id)} onChange={(e) => toggleShare(doctor._id, e.target.checked)} />
                        {doctor.name}
                      </label>
                    ))}
                  </div>
                  {selectedShareNames ? <p className="mt-2 text-xs text-slate-500">Shared with: {selectedShareNames}</p> : null}
                </div>

                <button type="submit" disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save SOAP note'}
                </button>
              </aside>
            </form>

            <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-4">
                <h3 className="flex items-center gap-2 text-base font-semibold text-slate-950">
                  <FileText className="h-5 w-5 text-blue-700" />
                  Saved notes
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {notes.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500">No clinical notes yet.</p>
                ) : (
                  notes.map((note) => (
                    <article key={note._id} className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{note.noteNumber} - {note.chiefComplaint}</p>
                          <p className="mt-1 text-xs text-slate-500">{formatDate(note.encounterDate)} by {note.providerName} - {note.triageLevel}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => downloadPdf(note)} className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50">
                            <Download className="h-4 w-4" />
                            Download PDF
                          </button>
                          <button onClick={() => deleteNote(note)} className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                        <p><span className="font-semibold">Assessment:</span> {note.assessment || 'Not documented'}</p>
                        <p><span className="font-semibold">Plan:</span> {note.plan || 'Not documented'}</p>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </SidebarLayout>
    </ProtectedRoute>
  );
}
