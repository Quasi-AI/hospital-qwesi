'use client';

import { useEffect, useState } from 'react';
import { Stethoscope, Mail, BriefcaseMedical } from 'lucide-react';

export default function PatientDoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/patient-portal/doctors')
      .then((res) => res.json())
      .then((data) => setDoctors(data.doctors || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">My Doctors</h1>
        <p className="text-sm text-slate-600">Profiles are shown for doctors assigned to you or who attended to you before.</p>
      </div>

      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-teal-600" />
        </div>
      ) : doctors.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          No doctor profiles are available yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {doctors.map((doctor) => (
            <article key={doctor._id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                {doctor.image ? (
                  <img src={doctor.image} alt={doctor.name} className="h-16 w-16 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                    <Stethoscope className="h-7 w-7" />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-slate-950">{doctor.name}</h2>
                  <p className="text-sm text-teal-700">{doctor.specialization || doctor.department || 'Doctor'}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <Mail className="h-3.5 w-3.5" />
                    {doctor.email}
                  </p>
                </div>
              </div>
              {doctor.bio ? <p className="mt-4 text-sm leading-relaxed text-slate-600">{doctor.bio}</p> : null}
              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                {doctor.yearsOfExperience != null ? (
                  <p className="flex items-center gap-2">
                    <BriefcaseMedical className="h-4 w-4 text-slate-400" />
                    {doctor.yearsOfExperience} years experience
                  </p>
                ) : null}
                {doctor.qualifications?.length ? <p>{doctor.qualifications.join(', ')}</p> : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
