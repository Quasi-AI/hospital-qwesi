'use client';

import { Stethoscope, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const handleLoginClick = () => {
    window.open('/login', '_blank');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="px-4 text-center sm:px-6 lg:px-8">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600">
          <Stethoscope className="h-8 w-8 text-white" />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-gray-900 sm:text-4xl">
          Qwesi AI Virtual Hospital
        </h1>
        <p className="mb-8 max-w-xl text-base text-gray-600 sm:mx-auto sm:text-lg">
          AI-powered virtual hospital and healthcare management platform
        </p>
        <button
          type="button"
          onClick={handleLoginClick}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-base font-medium text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg"
        >
          <span>Access Login</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
