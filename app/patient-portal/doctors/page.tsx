'use client';

import { DoctorMarketplace } from '@/app/components/doctor-marketplace';

export default function PatientDoctorsPage() {
  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-6 max-w-2xl">
        <h1 className="font-display text-3xl font-semibold text-brand-950">Find a doctor</h1>
        <p className="mt-2 text-gray-600">
          Compare consultation fees, pick a doctor, then choose a time and pay to confirm your booking.
        </p>
      </div>
      <DoctorMarketplace portal />
    </div>
  );
}
