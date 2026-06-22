'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Calendar, Heart, MessageCircle, Plus, Stethoscope, UserRound } from 'lucide-react';

type Provider = {
  _id: string;
  name: string;
  role: 'doctor' | 'nurse';
  specialization?: string;
  department?: string;
  languages?: string[];
  rating?: number;
  ratingCount?: number;
};

type HomeCareTask = {
  _id: string;
  title: string;
  category: string;
  status: string;
  dueAt?: string;
  assignedTo?: string;
  notes?: string;
};

const initialForm = {
  title: '',
  category: 'nursing',
  dueAt: '',
  assignedProviderId: '',
  notes: '',
};

function providerLabel(provider: Provider) {
  return provider.specialization || provider.department || (provider.role === 'nurse' ? 'Nursing care' : 'Doctor');
}

export default function PatientHomeCarePage() {
  const [tasks, setTasks] = useState<HomeCareTask[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const nurses = useMemo(() => providers.filter((provider) => provider.role === 'nurse'), [providers]);
  const doctors = useMemo(() => providers.filter((provider) => provider.role === 'doctor'), [providers]);

  const loadHomeCare = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/patient-portal/home-care', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to load home care');
      setTasks(data.tasks || []);
      setProviders(data.providers || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load home care');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomeCare();
  }, []);

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/patient-portal/home-care', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to request home care');
      setTasks((current) => [data.task, ...current]);
      setForm(initialForm);
      setMessage('Home-care request submitted.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to request home care');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-950">Home Care</h1>
        <p className="mt-1 text-sm text-slate-600">Home follow-up, nursing visits, recovery reminders, and care tasks.</p>
      </div>

      {message ? (
        <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Link href="/patient-portal/appointments/new" className="rounded-lg border border-gray-200 bg-white p-4 hover:border-emerald-200">
          <Calendar className="h-5 w-5 text-emerald-600" />
          <h2 className="mt-3 text-sm font-semibold text-slate-950">Request a doctor visit</h2>
          <p className="mt-1 text-sm text-slate-500">Book a follow-up or home-care appointment with an approved doctor.</p>
        </Link>
        <Link href="/patient-portal/messages" className="rounded-lg border border-gray-200 bg-white p-4 hover:border-emerald-200">
          <MessageCircle className="h-5 w-5 text-emerald-600" />
          <h2 className="mt-3 text-sm font-semibold text-slate-950">Contact care team</h2>
          <p className="mt-1 text-sm text-slate-500">Ask about wound care, medication, recovery tasks, or nurse support.</p>
        </Link>
      </div>

      <form onSubmit={submitRequest} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-950">Request home-care support</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Request title
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Wound dressing, medication check..."
              className="mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Care type
            <select
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
              className="mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="nursing">Nursing</option>
              <option value="medication">Medication</option>
              <option value="wound-care">Wound care</option>
              <option value="therapy">Therapy</option>
              <option value="follow-up">Follow-up</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Preferred date and time
            <input
              type="datetime-local"
              value={form.dueAt}
              onChange={(event) => setForm({ ...form, dueAt: event.target.value })}
              className="mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Preferred provider
            <select
              value={form.assignedProviderId}
              onChange={(event) => setForm({ ...form, assignedProviderId: event.target.value })}
              className="mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Any available doctor or nurse</option>
              {nurses.length ? <option disabled>-- Nurses --</option> : null}
              {nurses.map((provider) => (
                <option key={provider._id} value={provider._id}>
                  Nurse {provider.name}
                </option>
              ))}
              {doctors.length ? <option disabled>-- Doctors --</option> : null}
              {doctors.map((provider) => (
                <option key={provider._id} value={provider._id}>
                  Dr. {provider.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Notes
            <textarea
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-9 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Submitting...' : 'Submit request'}
          </button>
        </div>
      </form>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <Heart className="h-4 w-4 text-emerald-600" />
              Scheduled home-care tasks
            </h2>
          </div>
          {loading ? (
            <div className="flex min-h-32 items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-emerald-600" />
            </div>
          ) : tasks.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Scheduled home-care tasks will appear here.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {tasks.map((task) => (
                <article key={task._id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">{task.title}</h3>
                      <p className="mt-1 text-xs capitalize text-slate-500">{task.category.replace('-', ' ')} - {task.status.replace('-', ' ')}</p>
                    </div>
                    {task.dueAt ? <p className="text-xs font-medium text-emerald-700">{new Date(task.dueAt).toLocaleString()}</p> : null}
                  </div>
                  {task.assignedTo ? <p className="mt-2 text-sm text-slate-700">{task.assignedTo}</p> : null}
                  {task.notes ? <p className="mt-2 text-sm text-slate-500">{task.notes}</p> : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-950">Home-care providers</h2>
          <p className="mt-1 text-xs text-slate-500">Approved doctors and nurses available for home-care requests.</p>
          <div className="mt-3 space-y-2">
            {providers.length === 0 ? (
              <p className="text-sm text-slate-500">No approved home-care providers are available yet.</p>
            ) : (
              providers.slice(0, 8).map((provider) => (
                <div key={provider._id} className="rounded-md border border-slate-100 p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                      {provider.role === 'nurse' ? <UserRound className="h-4 w-4" /> : <Stethoscope className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {provider.role === 'nurse' ? 'Nurse ' : 'Dr. '}{provider.name}
                      </p>
                      <p className="text-xs text-slate-500">{providerLabel(provider)}</p>
                      {provider.languages?.length ? (
                        <p className="mt-1 text-xs text-slate-500">{provider.languages.join(', ')}</p>
                      ) : null}
                      {provider.rating ? (
                        <p className="mt-1 text-xs font-medium text-amber-700">
                          {provider.rating.toFixed(1)} / 5{provider.ratingCount ? ` (${provider.ratingCount})` : ''}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
