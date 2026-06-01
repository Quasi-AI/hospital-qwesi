'use client';

import Link from 'next/link';
import { Calendar, Heart, MessageCircle } from 'lucide-react';

export default function PatientHomeCarePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-950">Home Care</h1>
        <p className="mt-1 text-sm text-slate-600">Home follow-up, nursing visits, recovery reminders, and care tasks.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Link href="/patient-portal/appointments/new" className="rounded-lg border border-gray-200 bg-white p-4 hover:border-emerald-200">
          <Calendar className="h-5 w-5 text-emerald-600" />
          <h2 className="mt-3 text-sm font-semibold text-slate-950">Request a visit</h2>
          <p className="mt-1 text-sm text-slate-500">Book a follow-up or home-care appointment.</p>
        </Link>
        <Link href="/patient-portal/messages" className="rounded-lg border border-gray-200 bg-white p-4 hover:border-emerald-200">
          <MessageCircle className="h-5 w-5 text-emerald-600" />
          <h2 className="mt-3 text-sm font-semibold text-slate-950">Contact care team</h2>
          <p className="mt-1 text-sm text-slate-500">Ask about wound care, medication, and recovery tasks.</p>
        </Link>
      </div>

      <div className="rounded-lg border border-dashed border-gray-200 bg-white p-6">
        <Heart className="h-6 w-6 text-gray-400" />
        <p className="mt-3 text-sm text-slate-500">Scheduled home-care tasks will appear here.</p>
      </div>
    </div>
  );
}
