// src/core/auth/useRole.ts
// Role-based permission check

import { useAuthContext } from './AuthProvider';
import type { UserRole } from '../../shared/types/database';

export function useRole() {
  const { role } = useAuthContext();
  
  return {
    role,
    isSuperAdmin: role === 'super_admin',
    isClinicAdmin: role === 'clinic_admin',
    isDoctor: role === 'doctor',
    isReceptionist: role === 'receptionist',
    hasRole: (roles: UserRole[]) => roles.includes(role ?? 'receptionist'),
  };
}
