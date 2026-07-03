export type Permission =
  | 'view_patients' | 'edit_patients'
  | 'view_sessions' | 'edit_sessions'
  | 'view_invoices' | 'edit_invoices'
  | 'view_queue' | 'edit_queue'
  | 'view_analytics' | 'edit_analytics'
  | 'view_staff' | 'edit_staff'
  | 'view_settings' | 'edit_settings'
  | 'view_audit' | 'super_admin_access';

export type UserRole = 'super_admin' | 'clinic_admin' | 'doctor' | 'receptionist';

export const permissionMatrix: Record<UserRole, Permission[]> = {
  super_admin: [
    'view_patients', 'edit_patients', 'view_sessions', 'edit_sessions',
    'view_invoices', 'edit_invoices', 'view_queue', 'edit_queue',
    'view_analytics', 'edit_analytics', 'view_staff', 'edit_staff',
    'view_settings', 'edit_settings', 'view_audit', 'super_admin_access',
  ],
  clinic_admin: [
    'view_patients', 'edit_patients', 'view_sessions', 'edit_sessions',
    'view_invoices', 'edit_invoices', 'view_queue', 'edit_queue',
    'view_analytics', 'edit_analytics', 'view_staff', 'edit_staff',
    'view_settings', 'edit_settings', 'view_audit',
  ],
  doctor: [
    'view_patients', 'edit_patients', 'view_sessions', 'edit_sessions', 'view_queue',
  ],
  receptionist: [
    'view_patients', 'edit_patients', 'view_sessions',
    'view_invoices', 'edit_invoices', 'view_queue', 'edit_queue',
  ],
};

export function hasPermission(role: UserRole | null | undefined, action: Permission): boolean {
  if (!role) return false;
  return permissionMatrix[role]?.includes(action) ?? false;
}

export function getDefaultRoute(role: UserRole | null | undefined): string {
  switch (role) {
    case 'super_admin': return '/super-admin';
    case 'clinic_admin': return '/admin';
    case 'doctor': return '/doctor';
    case 'receptionist': return '/reception';
    default: return '/login';
  }
}
