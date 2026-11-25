import { redirect } from 'next/navigation';

// The old plans & PAYG list is gone: patients buy Qwesi AI credits and pay each doctor's own fee per consultation.
export default function SubscriptionsPage() {
  redirect('/#plans');
}
