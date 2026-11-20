import ProtectedRoute from '../protected-route';
import { PharmacyAttachedDashboard } from '../components/dashboards';

export default function PharmacyPage() {
  return (
    <ProtectedRoute>
      <PharmacyAttachedDashboard />
    </ProtectedRoute>
  );
}
