import ProtectedRoute from '../protected-route';
import { AdminAttachedDashboard } from '../components/dashboards';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <AdminAttachedDashboard />
    </ProtectedRoute>
  );
}
