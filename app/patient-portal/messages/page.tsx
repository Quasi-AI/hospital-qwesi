'use client';

import { DirectMessages } from '@/app/components/direct-messages';

export default function PatientMessagesPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Messages</h1>
        <p className="text-sm text-slate-600">Message doctors who have attended to you before.</p>
      </div>
      <DirectMessages />
    </div>
  );
}
