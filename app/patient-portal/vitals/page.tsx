'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  HeartPulse,
  Loader2,
  Save,
  Thermometer,
  Weight,
  Wind,
} from 'lucide-react';

type VitalSign = {
  timestamp: string;
  bloodPressure?: string;
  pulse?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  notes?: string;
  recordedBy?: string;
  source?: string;
};

type VitalForm = {
  bloodPressure: string;
  pulse: string;
  temperature: string;
  respiratoryRate: string;
  oxygenSaturation: string;
  weight: string;
  notes: string;
};

const emptyForm: VitalForm = {
  bloodPressure: '',
  pulse: '',
  temperature: '',
  respiratoryRate: '',
  oxygenSaturation: '',
  weight: '',
  notes: '',
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function readingSummary(vital: VitalSign) {
  const parts = [
    vital.bloodPressure ? `BP ${vital.bloodPressure}` : '',
    vital.pulse ? `${vital.pulse} bpm` : '',
    vital.temperature ? `${vital.temperature} F` : '',
    vital.oxygenSaturation ? `SpO2 ${vital.oxygenSaturation}%` : '',
  ].filter(Boolean);

  return parts.length ? parts.join(' | ') : 'Vitals recorded';
}

export default function PatientVitalsPage() {
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [form, setForm] = useState<VitalForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const latest = vitals[0];
  const hasAnyReading = useMemo(
    () =>
      Boolean(
        form.bloodPressure ||
          form.pulse ||
          form.temperature ||
          form.respiratoryRate ||
          form.oxygenSaturation ||
          form.weight
      ),
    [form]
  );

  const loadVitals = async () => {
    try {
      const response = await fetch('/api/patient-portal/vitals');
      const data = await response.json();
      if (response.ok) {
        setVitals(data.vitals || []);
      }
    } catch (error) {
      console.error('Error loading vitals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVitals();
  }, []);

  const saveVitals = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (!hasAnyReading) {
      setMessage({ type: 'error', text: 'Add at least one reading before saving.' });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/patient-portal/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Could not save vitals.' });
        return;
      }
      setVitals(data.vitals || []);
      setForm(emptyForm);
      setMessage({ type: 'success', text: 'Vitals saved for your care team.' });
    } catch (error) {
      console.error('Error saving vitals:', error);
      setMessage({ type: 'error', text: 'Could not save vitals.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-teal-600" />
          <p className="mt-2 text-sm text-gray-600">Loading vitals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-teal-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Patient-entered vitals</p>
            <h1 className="mt-1 text-xl font-bold text-gray-950">Share your latest readings</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-600">
              Add home readings here so your doctors and nurses can review changes before or during your visit.
            </p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
            <HeartPulse className="h-6 w-6" />
          </div>
        </div>
      </div>

      {latest ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Latest</p>
            <p className="mt-2 text-sm font-semibold text-gray-900">{formatDateTime(latest.timestamp)}</p>
            <p className="mt-1 text-xs text-gray-500">{readingSummary(latest)}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Blood pressure</p>
            <p className="mt-2 text-2xl font-bold text-gray-950">{latest.bloodPressure || '-'}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Pulse</p>
            <p className="mt-2 text-2xl font-bold text-gray-950">{latest.pulse ? `${latest.pulse} bpm` : '-'}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Oxygen</p>
            <p className="mt-2 text-2xl font-bold text-gray-950">
              {latest.oxygenSaturation ? `${latest.oxygenSaturation}%` : '-'}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <form onSubmit={saveVitals} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-950">
            <Activity className="h-4 w-4 text-teal-600" />
            Add vitals
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-gray-700">Blood pressure</span>
              <input
                type="text"
                placeholder="120/80"
                value={form.bloodPressure}
                onChange={(e) => setForm({ ...form, bloodPressure: e.target.value })}
                className="mt-1 h-10 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-700">Pulse (bpm)</span>
              <input
                type="number"
                min="0"
                value={form.pulse}
                onChange={(e) => setForm({ ...form, pulse: e.target.value })}
                className="mt-1 h-10 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-700">Temperature (F)</span>
              <input
                type="number"
                step="0.1"
                value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                className="mt-1 h-10 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-700">Respiratory rate</span>
              <input
                type="number"
                min="0"
                value={form.respiratoryRate}
                onChange={(e) => setForm({ ...form, respiratoryRate: e.target.value })}
                className="mt-1 h-10 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-700">Oxygen saturation (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                value={form.oxygenSaturation}
                onChange={(e) => setForm({ ...form, oxygenSaturation: e.target.value })}
                className="mt-1 h-10 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-700">Weight</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                className="mt-1 h-10 w-full rounded-md border border-gray-200 px-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
              />
            </label>
          </div>
          <label className="mt-3 block">
            <span className="text-xs font-medium text-gray-700">Notes</span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
              placeholder="Symptoms, context, or device used"
            />
          </label>

          {message ? (
            <div
              className={`mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                message.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
              <span>{message.text}</span>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save vitals
          </button>
        </form>

        <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-gray-950">Vitals history</h2>
          <div className="mt-4 space-y-3">
            {vitals.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center">
                <HeartPulse className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">No vitals added yet.</p>
              </div>
            ) : (
              vitals.map((vital, index) => (
                <article key={`${vital.timestamp}-${index}`} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-950">{formatDateTime(vital.timestamp)}</p>
                      <p className="text-xs text-gray-500">{vital.recordedBy || 'Patient'}</p>
                    </div>
                    <span className="w-fit rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold capitalize text-teal-700">
                      {vital.source || 'patient'}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    {vital.bloodPressure ? <span>BP: {vital.bloodPressure}</span> : null}
                    {vital.pulse ? <span>Pulse: {vital.pulse} bpm</span> : null}
                    {vital.temperature ? (
                      <span className="inline-flex items-center gap-1">
                        <Thermometer className="h-3.5 w-3.5 text-orange-500" />
                        {vital.temperature} F
                      </span>
                    ) : null}
                    {vital.respiratoryRate ? (
                      <span className="inline-flex items-center gap-1">
                        <Wind className="h-3.5 w-3.5 text-blue-500" />
                        {vital.respiratoryRate}/min
                      </span>
                    ) : null}
                    {vital.oxygenSaturation ? <span>SpO2: {vital.oxygenSaturation}%</span> : null}
                    {vital.weight ? (
                      <span className="inline-flex items-center gap-1">
                        <Weight className="h-3.5 w-3.5 text-gray-500" />
                        {vital.weight}
                      </span>
                    ) : null}
                  </div>
                  {vital.notes ? <p className="mt-2 text-sm leading-relaxed text-gray-600">{vital.notes}</p> : null}
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
