'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { LogoLink } from '@/app/components/logo';

type Result = { status: string; error?: string; practitioner?: string; date?: string; time?: string; setPasswordUrl?: string | null };

export function PayReturn() {
  const sp = useSearchParams();
  const reference = sp.get('reference') || sp.get('trxref') || '';
  const [r, setR] = useState<Result | null>(null);

  useEffect(() => {
    if (!reference) return setR({ status: 'failed', error: 'Missing payment reference.' });
    fetch(`/api/public/payment/confirm?reference=${encodeURIComponent(reference)}`)
      .then(async (res) => setR({ status: 'failed', ...(await res.json().catch(() => ({}))) }))
      .catch(() => setR({ status: 'failed', error: 'Could not confirm your payment. If you were charged, message Qwesi on WhatsApp.' }));
  }, [reference]);

  const booked = r?.status === 'booked';
  return (
    <div className="qw-card w-full max-w-md p-6 text-center sm:p-8">
      <div className="mb-6 flex justify-center"><LogoLink className="h-8" priority /></div>
      {!r && (<><Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-600" /><p className="mt-4 text-gray-600">Confirming your payment…</p></>)}
      {r && booked && (
        <>
          <CheckCircle2 className="mx-auto h-12 w-12 text-brand-600" />
          <h1 className="font-display mt-4 text-2xl font-semibold text-brand-950">You&apos;re booked</h1>
          <p className="mt-2 text-gray-600">{r.practitioner} · {r.date} at {r.time}. We&apos;ll remind you before it starts.</p>
          {r.setPasswordUrl ? (
            <>
              <p className="mt-4 text-sm text-gray-600">One last step: set a password so you can join the consultation. Your phone number is your login.</p>
              <Link href={r.setPasswordUrl} className="mt-4 inline-flex h-11 items-center rounded-full bg-brand-600 px-6 font-semibold text-white">Set my password</Link>
            </>
          ) : (
            <Link href="/patient-portal/appointments" className="mt-6 inline-flex h-11 items-center rounded-full bg-brand-600 px-6 font-semibold text-white">View my appointments</Link>
          )}
        </>
      )}
      {r && !booked && (
        <>
          <AlertTriangle className="mx-auto h-12 w-12 text-brand-600" />
          <h1 className="font-display mt-4 text-2xl font-semibold text-brand-950">{r.status === 'paid_slot_unavailable' ? 'Paid — time slot taken' : 'Payment not confirmed'}</h1>
          <p className="mt-2 text-gray-600">{r.status === 'paid_slot_unavailable' ? 'Your payment is safe. That time was just taken — message Qwesi on WhatsApp to pick another time at no extra cost.' : r.error}</p>
        </>
      )}
    </div>
  );
}
