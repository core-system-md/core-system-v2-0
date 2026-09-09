import RevenueCards from './RevenueCards';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';

export default function AdminRevenuePage() {
  return (
    <PermissionGuard required="view_invoices">
      <RevenueCards />
    </PermissionGuard>
  );
}
