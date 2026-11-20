import { Suspense } from 'react';
import type { Metadata } from 'next';
import SignupForm from '@/app/components/signup-form';

export const metadata: Metadata = { title: 'Sign up as a pharmacy · Qwesi' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SignupForm role="pharmacy" />
    </Suspense>
  );
}
