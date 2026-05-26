import { redirect } from 'next/navigation';

/** Legacy URL: public site lives at `/` */
export default function LegacyLandingRedirect() {
  redirect('/');
}
