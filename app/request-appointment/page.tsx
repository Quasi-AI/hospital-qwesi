import { redirect } from 'next/navigation';

/** Guest "request" form was replaced by the pay-to-book doctor marketplace. */
export default function RequestAppointmentPage() {
  redirect('/find-doctors');
}
