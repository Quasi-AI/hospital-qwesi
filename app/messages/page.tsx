'use client';

import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { DirectMessages } from '@/app/components/direct-messages';

export default function MessagesPage() {
  return (
    <ProtectedRoute>
      <SidebarLayout title="Direct Messages" description="Doctor, staff, and patient conversations" dense wide>
        <DirectMessages />
      </SidebarLayout>
    </ProtectedRoute>
  );
}
