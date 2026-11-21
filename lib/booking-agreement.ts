/** Telemedicine consent a patient signs when booking an appointment (web or WhatsApp/Facebook). */
export const BOOKING_AGREEMENT_VERSION = '2026-11';

export const BOOKING_AGREEMENT_TITLE = 'Telemedicine consultation agreement';

export const BOOKING_AGREEMENT_POINTS = [
  'This is a virtual consultation. The practitioner cannot examine you in person, so some conditions may need an in-person visit or referral.',
  'Qwesi is not an emergency service. For chest pain, severe bleeding, trouble breathing, stroke signs, seizures or loss of consciousness, go to the nearest emergency service or call 112 now.',
  'I will give accurate information about my health, medicines and allergies, and I am responsible for the fee shown before booking. Fees are set by the practitioner.',
  'My health information is confidential. I allow the practitioner assigned to me, and Qwesi staff who support my care, to see and record it. Other practitioners cannot see my records.',
  'The consultation will not be recorded unless I agree to it at the time. The practitioner may issue a prescription where clinically appropriate.',
  'Cancelling or rescheduling follows the practitioner\'s and Qwesi\'s policy shown at booking.',
] as const;

export type BookingAgreement = {
  accepted: true;
  signedName: string;
  signedAt: Date;
  version: string;
  channel: 'web' | 'whatsapp' | 'facebook' | 'other';
};

/** Validates the agreement sent with a booking; returns the record to store or an error message. */
export function parseBookingAgreement(
  raw: unknown,
  channel: BookingAgreement['channel'] = 'web'
): { ok: true; agreement: BookingAgreement } | { ok: false; error: string } {
  const a = (raw || {}) as { accepted?: unknown; signedName?: unknown };
  const signedName = String(a.signedName || '').trim();
  if (a.accepted !== true) return { ok: false, error: 'Please accept the consultation agreement to book.' };
  if (signedName.length < 3 || !/\s/.test(signedName)) {
    return { ok: false, error: 'Please sign the agreement with your full name.' };
  }
  return {
    ok: true,
    agreement: { accepted: true, signedName: signedName.slice(0, 120), signedAt: new Date(), version: BOOKING_AGREEMENT_VERSION, channel },
  };
}
