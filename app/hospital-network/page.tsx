import ProtectedRoute from '../protected-route';
import { HospitalNetworkDashboard } from '../components/qwesi-network-dashboards';

export default function HospitalNetworkPage() {
  return (
    <ProtectedRoute>
      <HospitalNetworkDashboard />
    </ProtectedRoute>
  );
}
