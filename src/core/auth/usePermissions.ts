import { useAuthStore } from '@/shared/store/authStore';
import { hasPermission } from '@/core/permissions/permissionMatrix';
import type { Permission } from '@/core/permissions/permissionMatrix';

export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;

  const can = (action: Permission): boolean => {
    if (!role) return false;
    return hasPermission(role, action);
  };

  const canAny = (actions: Permission[]): boolean => {
    return actions.some((a) => can(a));
  };

  const canAll = (actions: Permission[]): boolean => {
    return actions.every((a) => can(a));
  };

  return { can, canAny, canAll, role };
}
