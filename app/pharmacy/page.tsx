import ProtectedRoute from '../protected-route';
import { PharmacyAttachedDashboard } from '../components/qwesi-network-dashboards';

export default function PharmacyPage() {
  return (
    <ProtectedRoute>
      <PharmacyAttachedDashboard />
    </ProtectedRoute>
  );
}
