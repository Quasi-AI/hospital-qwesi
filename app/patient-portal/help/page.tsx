'use client';

import { HelpCircle } from 'lucide-react';
import { DirectMessages } from '@/app/components/direct-messages';

export default function PatientHelpPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-950">Help & Support</h1>
        <p className="mt-1 text-sm text-slate-600">Support for appointments, referrals, prescriptions, and portal access.</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <HelpCircle className="h-8 w-8 text-emerald-600" />
        <h2 className="mt-4 text-base font-semibold text-slate-950">Need help?</h2>
        <p className="mt-1 text-sm text-slate-500">
          Send a live support message to Qwesi admins or info@qwesi.org. Include any appointment, referral, prescription, or portal issue details.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <DirectMessages recipientScope="support" />
      </div>
    </div>
  );
}
