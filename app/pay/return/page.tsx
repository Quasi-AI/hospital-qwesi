import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PayReturn } from './pay-return';

export const metadata: Metadata = { title: 'Payment · Qwesi AI', robots: { index: false } };

export default function PayReturnPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Suspense fallback={null}><PayReturn /></Suspense>
    </div>
  );
}
