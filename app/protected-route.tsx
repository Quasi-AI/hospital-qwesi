'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const providerRoles = ['doctor', 'staff', 'nurse', 'pharmacy'];

function roleHome(role?: string | null) {
  if (role === 'patient') return '/patient-portal';
  if (role === 'pharmacy') return '/pharmacy';
  if (role === 'hospital') return '/hospital-portal';
  return '/dashboard';
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (!session) {
      router.push('/login');
      return;
    }

    // Redirect patients to patient portal if they try to access staff pages
    if (session.user?.role === 'patient') {
      // Allow access to patient portal routes
      if (!pathname.startsWith('/patient-portal')) {
        router.push('/patient-portal');
      }
    } else if (session.user?.role === 'pharmacy' && pathname === '/dashboard') {
      router.push('/pharmacy');
    } else if (session.user?.role === 'hospital' && pathname === '/dashboard') {
      router.push('/hospital-portal');
    } else if (
      providerRoles.includes(session.user?.role || '') &&
      (!session.user?.hasImage || !session.user?.hasLicenseCertificate || !session.user?.hasLicenseNumber) &&
      pathname !== '/profile'
    ) {
      router.push(`/profile?verificationRequired=1&returnTo=${encodeURIComponent(roleHome(session.user?.role))}`);
    } else if (
      providerRoles.includes(session.user?.role || '') &&
      session.user?.approvalStatus &&
      session.user.approvalStatus !== 'approved' &&
      pathname !== '/profile'
    ) {
      router.push(`/profile?approvalRequired=1&returnTo=${encodeURIComponent(roleHome(session.user?.role))}`);
    }
  }, [session, status, router, pathname]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
}
