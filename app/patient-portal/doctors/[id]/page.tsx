'use client';

import { use } from 'react';
import { DoctorProfile } from '@/app/components/doctor-profile';

export default function PatientDoctorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="mx-auto max-w-6xl p-4 pb-28 sm:p-6 lg:pb-8">
      <DoctorProfile id={id} portal />
    </div>
  );
}
