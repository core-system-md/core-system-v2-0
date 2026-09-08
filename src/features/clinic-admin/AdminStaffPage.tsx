import StaffPerformance from './StaffPerformance';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';

export default function AdminStaffPage() {
  return (
    <PermissionGuard required="view_staff">
      <StaffPerformance />
    </PermissionGuard>
  );
}
