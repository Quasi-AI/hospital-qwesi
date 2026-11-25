'use client';

import ProtectedRoute from '../protected-route';
import SidebarLayout from './sidebar-layout';
import { ContentSkeleton } from './Skeletons';

/** Shown while a dashboard page loads: the real sidebar + navbar with a skeleton in place of the content. */
export default function DashboardLoading() {
  return (
    <ProtectedRoute>
      <SidebarLayout title="" description="" dense>
        <ContentSkeleton variant="page" rows={6} stats={4} />
      </SidebarLayout>
    </ProtectedRoute>
  );
}
