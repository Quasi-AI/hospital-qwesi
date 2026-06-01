import ProtectedRoute from '../protected-route';
import { AdminAttachedDashboard } from '../components/qwesi-network-dashboards';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <AdminAttachedDashboard />
    </ProtectedRoute>
  );
}
