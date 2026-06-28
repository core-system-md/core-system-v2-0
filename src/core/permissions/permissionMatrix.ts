// ============================================================
// CORE SYSTEM v2.1 — Permission Matrix (RBAC)
// Constitution §6: 4 Roles Only — NO new roles without written approval.
// Doctor CANNOT see clinic_invoices (RLS wall enforced).
// Receptionist CANNOT modify clinical notes or scores.
// ============================================================

import type { UserRole } from '@/shared/types/auth';

export type Permission = 
  | 'view_dashboard'
  | 'view_queue'
  | 'manage_queue'
  | 'view_patients'
  | 'edit_patients'
  | 'view_sessions'
  | 'edit_sessions'
  | 'view_notes'
  | 'edit_notes'
  | 'view_invoices'
  | 'create_invoices'
  | 'edit_invoices'
  | 'view_analytics'
  | 'view_admin'
  | 'manage_staff'
  | 'manage_rooms'
  | 'manage_procedures'
  | 'view_audit'
  | 'manage_tenants'
  | 'manage_feature_flags'
  | 'use_pin_login';

const PERMISSION_MATRIX: Record<UserRole, Permission[]> = {
  super_admin: [
    'view_dashboard', 'view_queue', 'manage_queue',
    'view_patients', 'edit_patients',
    'view_sessions', 'edit_sessions',
    'view_notes', 'edit_notes',
    'view_invoices', 'create_invoices', 'edit_invoices',
    'view_analytics', 'view_admin',
    'manage_staff', 'manage_rooms', 'manage_procedures',
    'view_audit', 'manage_tenants', 'manage_feature_flags',
    'use_pin_login',
  ],
  clinic_admin: [
    'view_dashboard', 'view_queue', 'manage_queue',
    'view_patients', 'edit_patients',
    'view_sessions', 'edit_sessions',
    'view_notes', 'edit_notes',
    'view_invoices', 'create_invoices', 'edit_invoices',
    'view_analytics', 'view_admin',
    'manage_staff', 'manage_rooms', 'manage_procedures',
    'view_audit',
    'use_pin_login',
  ],
  doctor: [
    'view_dashboard',
    'view_queue',
    'view_patients', 'edit_patients',
    'view_sessions', 'edit_sessions',
    'view_notes', 'edit_notes',
    // NO invoices — RLS wall + PermissionMatrix双重保护
    'use_pin_login',
  ],
  receptionist: [
    'view_dashboard', 'view_queue', 'manage_queue',
    'view_patients', 'edit_patients',
    'view_sessions',
    'view_notes', // View only — NO edit
    'view_invoices', 'create_invoices', 'edit_invoices',
    'use_pin_login',
  ],
};

export function hasPermission(role: UserRole | null, permission: Permission): boolean {
  if (!role) return false;
  return PERMISSION_MATRIX[role].includes(permission);
}

export function getRolePermissions(role: UserRole): Permission[] {
  return PERMISSION_MATRIX[role];
}

// ── Route Guards ──
export const ROLE_ROUTES: Record<UserRole, string> = {
  super_admin: '/super-admin',
  clinic_admin: '/clinic-admin',
  doctor: '/doctor',
  receptionist: '/reception',
};

export function getDefaultRoute(role: UserRole | null): string {
  if (!role) return '/auth';
  return ROLE_ROUTES[role];
}
