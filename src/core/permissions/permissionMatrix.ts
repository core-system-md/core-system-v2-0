// src/core/permissions/permissionMatrix.ts
// Static map: role → allowed actions

import type { UserRole } from '../../shared/types/database';

export type PermissionAction =
  | 'view_patients'
  | 'create_patient'
  | 'edit_patient'
  | 'view_sessions'
  | 'edit_session'
  | 'view_invoices'
  | 'create_invoice'
  | 'collect_payment'
  | 'view_analytics'
  | 'edit_staff'
  | 'edit_settings'
  | 'override_lock'
  | 'admin_billing';

const PERMISSION_MATRIX: Record<UserRole, PermissionAction[]> = {
  super_admin: [
    'view_patients', 'create_patient', 'edit_patient',
    'view_sessions', 'edit_session',
    'view_invoices', 'create_invoice', 'collect_payment',
    'view_analytics', 'edit_staff', 'edit_settings', 'override_lock', 'admin_billing',
  ],
  clinic_admin: [
    'view_patients', 'create_patient', 'edit_patient',
    'view_sessions', 'edit_session',
    'view_invoices', 'create_invoice', 'collect_payment',
    'view_analytics', 'edit_staff', 'edit_settings', 'override_lock',
  ],
  doctor: [
    'view_patients', 'create_patient', 'edit_patient',
    'view_sessions', 'edit_session',
    'override_lock',
  ],
  receptionist: [
    'view_patients', 'create_patient',
    'view_sessions', 'edit_session',
    'view_invoices', 'create_invoice', 'collect_payment',
  ],
};

export function hasPermission(role: UserRole | null, action: PermissionAction): boolean {
  if (!role) return false;
  return PERMISSION_MATRIX[role]?.includes(action) ?? false;
}

export function getPermissions(role: UserRole | null): PermissionAction[] {
  if (!role) return [];
  return PERMISSION_MATRIX[role] ?? [];
}
