'use client';

import Link from 'next/link';
import { Activity, ArrowRight, Building2 } from 'lucide-react';

export default function PatientReferralsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-950">Referrals</h1>
        <p className="mt-1 text-sm text-slate-600">Hospital referrals, transfer notes, and specialist follow-up will be listed here.</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <Activity className="h-8 w-8 text-emerald-600" />
        <h2 className="mt-4 text-base font-semibold text-slate-950">No active referrals</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          When a doctor or nurse refers you to a connected hospital, the referral details and next steps will show on this page.
        </p>
        <Link href="/patient-portal/doctors" className="mt-4 inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          Find a doctor <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <Building2 className="mt-0.5 h-5 w-5 text-emerald-700" />
          <p className="text-sm text-emerald-900">Urgent referrals should also be confirmed directly with the receiving hospital or emergency desk.</p>
        </div>
      </div>
    </div>
  );
}
