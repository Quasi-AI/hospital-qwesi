'use client';

import Link from 'next/link';
import { MessageCircle, Stethoscope, Users } from 'lucide-react';

export default function PatientCareTeamPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-950">My Care Team</h1>
        <p className="mt-1 text-sm text-slate-600">Doctors, nurses, and care coordinators connected to your visits.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Link href="/patient-portal/doctors" className="rounded-lg border border-gray-200 bg-white p-4 hover:border-emerald-200">
          <Stethoscope className="h-5 w-5 text-emerald-600" />
          <h2 className="mt-3 text-sm font-semibold text-slate-950">Doctors</h2>
          <p className="mt-1 text-sm text-slate-500">View available doctors and appointment options.</p>
        </Link>
        <Link href="/patient-portal/messages" className="rounded-lg border border-gray-200 bg-white p-4 hover:border-emerald-200">
          <MessageCircle className="h-5 w-5 text-emerald-600" />
          <h2 className="mt-3 text-sm font-semibold text-slate-950">Care Messages</h2>
          <p className="mt-1 text-sm text-slate-500">Continue conversations with your care team.</p>
        </Link>
        <div className="rounded-lg border border-dashed border-gray-200 bg-white p-4">
          <Users className="h-5 w-5 text-gray-400" />
          <h2 className="mt-3 text-sm font-semibold text-slate-950">Assigned Team</h2>
          <p className="mt-1 text-sm text-slate-500">Assigned clinicians will appear here after appointments or referrals.</p>
        </div>
      </div>
    </div>
  );
}
