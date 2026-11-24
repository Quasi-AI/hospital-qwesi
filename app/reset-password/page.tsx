import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ResetPasswordForm } from './reset-form';

export const metadata: Metadata = { title: 'Reset password · Qwesi AI', robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Suspense fallback={null}><ResetPasswordForm /></Suspense>
    </div>
  );
}
