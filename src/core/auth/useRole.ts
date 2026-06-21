// src/core/auth/useRole.ts
// Blueprint: src/core/auth/useRole.ts
// Purpose: Role-based permission check

import { useAuth } from './AuthProvider';

export function useRole() {
  const { role } = useAuth();
  
  return {
    role,
    isSuperAdmin: role === 'super_admin',
    isClinicAdmin: role === 'clinic_admin',
    isDoctor: role === 'doctor',
    isReceptionist: role === 'receptionist',
    hasRole: (roles: string[]) => roles.includes(role ?? 'receptionist'),
  };
}
