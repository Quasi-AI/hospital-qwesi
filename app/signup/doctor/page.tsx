import { Suspense } from 'react';
import type { Metadata } from 'next';
import SignupForm from '@/app/components/signup-form';

export const metadata: Metadata = { title: 'Sign up as a doctor · Qwesi' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SignupForm role="doctor" />
    </Suspense>
  );
}
