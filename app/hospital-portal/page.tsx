import ProtectedRoute from '../protected-route';
import { HospitalPortalDashboard } from '../components/qwesi-network-dashboards';

export default function HospitalPortalPage() {
  return (
    <ProtectedRoute>
      <HospitalPortalDashboard />
    </ProtectedRoute>
  );
}
