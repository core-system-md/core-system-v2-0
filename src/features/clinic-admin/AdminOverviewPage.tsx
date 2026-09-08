import AnalyticsOverview from './AnalyticsOverview';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';

export default function AdminOverviewPage() {
  return (
    <PermissionGuard required="view_analytics">
      <AnalyticsOverview />
    </PermissionGuard>
  );
}
