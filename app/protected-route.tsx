'use client';


import { AppShellSkeleton } from '@/app/components/Skeletons';
import { signOut, useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const providerRoles = ['doctor', 'staff', 'nurse', 'pharmacy'];

function roleHome(role?: string | null) {
  if (role === 'patient') return '/patient-portal';
  if (role === 'pharmacy') return '/pharmacy';
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

    if ((session as any).error === 'AccountDeleted') {
      signOut({ callbackUrl: '/login?deleted=1' });
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
    return <AppShellSkeleton />;
  }

  if (!session) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
}
