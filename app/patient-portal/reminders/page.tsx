'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle2, Clock, Loader2, Pill } from 'lucide-react';

type Reminder = {
  _id: string;
  title: string;
  message: string;
  status: string;
  scheduledFor?: string;
  metadata?: {
    medication?: {
      name?: string;
      dosage?: string;
      frequency?: string;
      instructions?: string;
    };
  };
};

const frequencyOptions = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Four times daily',
  'Before meals',
  'After meals',
  'At bedtime',
  'Every 8 hours',
];

export default function PatientMedicationRemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({
    name: '',
    dosage: '',
    frequency: 'Once daily',
    duration: '7 days',
    instructions: '',
    startDate: new Date().toISOString().slice(0, 10),
  });

  const upcoming = useMemo(
    () => reminders.filter((reminder) => reminder.status === 'pending'),
    [reminders]
  );

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/patient-portal/medication-reminders');
      if (response.ok) {
        const data = await response.json();
        setReminders(data.reminders || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/patient-portal/medication-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Could not create reminders.' });
        return;
      }
      setMessage({ type: 'success', text: `${data.scheduled || 0} reminders scheduled.` });
      setForm((current) => ({ ...current, name: '', dosage: '', instructions: '' }));
      await load();
    } catch {
      setMessage({ type: 'error', text: 'Could not create reminders.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-950">Medication reminders</h1>
        <p className="mt-0.5 text-sm text-gray-600">Schedule reminders for taking prescribed drugs.</p>
      </div>

      {message ? (
        <div
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[24rem_1fr]">
        <form onSubmit={submit} className="space-y-3 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Pill className="h-4 w-4 text-teal-600" />
            <h2 className="text-sm font-semibold text-gray-950">New reminder</h2>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Medication name</label>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="e.g. Metformin"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Dosage</label>
            <input
              value={form.dosage}
              onChange={(event) => setForm((current) => ({ ...current, dosage: event.target.value }))}
              className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="e.g. 500 mg"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Frequency</label>
            <select
              value={form.frequency}
              onChange={(event) => setForm((current) => ({ ...current, frequency: event.target.value }))}
              className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {frequencyOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Duration</label>
              <input
                value={form.duration}
                onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))}
                className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="7 days"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Start date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
                className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Instructions</label>
            <textarea
              value={form.instructions}
              onChange={(event) => setForm((current) => ({ ...current, instructions: event.target.value }))}
              rows={2}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="e.g. Take after food"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            Schedule reminders
          </button>
        </form>

        <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-950">Upcoming reminders</h2>
              <p className="text-xs text-gray-500">{upcoming.length} pending reminders</p>
            </div>
          </div>
          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          ) : reminders.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 py-10 text-center text-sm text-gray-500">
              No medication reminders yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {reminders.map((reminder) => (
                <div key={reminder._id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-950">{reminder.metadata?.medication?.name || reminder.title}</p>
                    <p className="mt-0.5 text-sm text-gray-600">{reminder.message}</p>
                    {reminder.scheduledFor ? (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(reminder.scheduledFor).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                  <span className="w-fit rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-700">
                    {reminder.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
