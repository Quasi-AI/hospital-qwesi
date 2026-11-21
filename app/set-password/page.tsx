import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SetPasswordForm } from './set-password-form';

export const metadata: Metadata = { title: 'Set your password · Qwesi AI', robots: { index: false } };

export default function SetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Suspense fallback={null}><SetPasswordForm /></Suspense>
    </div>
  );
}
