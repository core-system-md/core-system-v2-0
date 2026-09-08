import StaffManagement from './StaffManagement';
import StaffPerformance from './StaffPerformance';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';

export default function AdminStaffPage() {
  return (
    <PermissionGuard required="view_staff">
      <div className="space-y-8">
        <StaffManagement />
        <StaffPerformance />
      </div>
    </PermissionGuard>
  );
}
