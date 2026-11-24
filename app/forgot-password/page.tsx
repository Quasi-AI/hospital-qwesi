import type { Metadata } from 'next';
import { ForgotPasswordForm } from './forgot-form';

export const metadata: Metadata = { title: 'Forgot password · Qwesi AI', robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <ForgotPasswordForm />
    </div>
  );
}
