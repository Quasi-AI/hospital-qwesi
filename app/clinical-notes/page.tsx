'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  FileText,
  Plus,
  Search,
  Stethoscope,
  Users,
} from 'lucide-react';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';

function formatDate(value?: string | Date) {
  if (!value) return 'No notes yet';
  return new Date(value).toLocaleString();
}

export default function ClinicalNotesPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [patientsRes, notesRes] = await Promise.all([
        fetch('/api/patients'),
        fetch('/api/clinical-notes'),
      ]);
      if (patientsRes.ok) setPatients(await patientsRes.json());
      if (notesRes.ok) setNotes((await notesRes.json()).notes || []);
      setLoading(false);
    }

    load();
  }, []);

  const notesByPatient = useMemo(() => {
    const map = new Map<string, any[]>();
    notes.forEach((note) => {
      const patientId = String(note.patientId || '');
      if (!patientId) return;
      const current = map.get(patientId) || [];
      current.push(note);
      map.set(patientId, current);
    });
    return map;
  }, [notes]);

  const filteredPatients = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return patients;
    return patients.filter((patient) => {
      return [patient.name, patient.patientId, patient.email, patient.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [patients, search]);

  const recentNotes = notes.slice(0, 6);

  return (
    <ProtectedRoute>
      <SidebarLayout title="Clinical Notes" description="Open the SOAP note template for any patient" dense wide>
        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-500">Patients</p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">{patients.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-500">SOAP notes</p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">{notes.length}</p>
                  </div>
                  <FileText className="h-8 w-8 text-emerald-600" />
                </div>
              </div>
              <Link
                href="/patients/new"
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
              >
                <div className="flex h-full items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">New patient</p>
                    <p className="mt-1 text-xs text-slate-600">Create a patient before writing a SOAP note.</p>
                  </div>
                  <Plus className="h-7 w-7 text-blue-600" />
                </div>
              </Link>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950">
                        <Stethoscope className="h-5 w-5 text-blue-700" />
                        SOAP note templates
                      </h2>
                      <p className="text-sm text-slate-600">Choose a patient to open the submitted SOAP note form.</p>
                    </div>
                    <div className="relative w-full sm:w-80">
                      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search patients"
                        className="h-9 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {filteredPatients.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500">No patients match your search.</p>
                  ) : (
                    filteredPatients.map((patient) => {
                      const patientNotes = notesByPatient.get(String(patient._id)) || [];
                      const latestNote = patientNotes[0];
                      return (
                        <Link
                          key={patient._id}
                          href={`/patients/${patient._id}/notes`}
                          className="flex flex-col gap-3 p-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">{patient.name}</p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {patient.patientId || 'No patient ID'} {patient.email ? `- ${patient.email}` : ''}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {patientNotes.length} saved note{patientNotes.length === 1 ? '' : 's'} - Latest: {formatDate(latestNote?.createdAt)}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-2 self-start rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white sm:self-center">
                            Open SOAP note
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        </Link>
                      );
                    })
                  )}
                </div>
              </section>

              <aside className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-4">
                  <h3 className="text-sm font-semibold text-slate-950">Recent notes</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {recentNotes.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500">No clinical notes yet.</p>
                  ) : (
                    recentNotes.map((note) => (
                      <Link
                        key={note._id}
                        href={`/patients/${note.patientId}/notes`}
                        className="block p-4 transition hover:bg-slate-50"
                      >
                        <p className="truncate text-sm font-semibold text-slate-950">{note.noteNumber}</p>
                        <p className="mt-1 truncate text-xs text-slate-600">{note.patientName} - {note.chiefComplaint}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatDate(note.createdAt)}</p>
                      </Link>
                    ))
                  )}
                </div>
              </aside>
            </div>
          </div>
        )}
      </SidebarLayout>
    </ProtectedRoute>
  );
}
