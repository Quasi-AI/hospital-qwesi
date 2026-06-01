'use client';

import { Plus, Users } from 'lucide-react';

export default function PatientFamilyPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-950">Family Members</h1>
          <p className="mt-1 text-sm text-slate-600">Linked dependants and family care access.</p>
        </div>
        <button type="button" className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700">
          <Plus className="h-4 w-4" /> Add member
        </button>
      </div>

      <div className="rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center">
        <Users className="mx-auto h-8 w-8 text-gray-300" />
        <h2 className="mt-3 text-sm font-semibold text-slate-950">No family members linked</h2>
        <p className="mt-1 text-sm text-slate-500">Family member records can be connected here once dependant access is enabled.</p>
      </div>
    </div>
  );
}
