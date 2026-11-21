'use client';

import { FileText } from 'lucide-react';
import { BOOKING_AGREEMENT_POINTS, BOOKING_AGREEMENT_TITLE } from '@/lib/booking-agreement';

export type AgreementValue = { accepted: boolean; signedName: string };

export function BookingAgreement({
  value,
  onChange,
  patientName,
}: {
  value: AgreementValue;
  onChange: (v: AgreementValue) => void;
  patientName?: string;
}) {
  return (
    <section className="qw-card space-y-3 p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-brand-950">
        <FileText className="h-4 w-4 text-brand-700" /> {BOOKING_AGREEMENT_TITLE}
      </h2>
      <ul className="max-h-40 list-disc space-y-1.5 overflow-y-auto rounded-xl bg-brand-50/70 p-3 pl-7 text-xs leading-relaxed text-gray-700 sm:max-h-none">
        {BOOKING_AGREEMENT_POINTS.map((p) => <li key={p}>{p}</li>)}
      </ul>
      <label className="flex items-start gap-3 text-sm text-gray-800">
        <input
          type="checkbox"
          checked={value.accepted}
          onChange={(e) => onChange({ ...value, accepted: e.target.checked })}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
        />
        <span>I have read and agree to this consultation agreement.</span>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-700">Electronic signature</span>
        <input
          value={value.signedName}
          onChange={(e) => onChange({ ...value, signedName: e.target.value })}
          placeholder={patientName ? `Type your full name (${patientName})` : 'Type your full name'}
          autoComplete="name"
          className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </label>
    </section>
  );
}

export const agreementSigned = (v: AgreementValue) => v.accepted && v.signedName.trim().length >= 3 && /\s/.test(v.signedName.trim());
