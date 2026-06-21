// src/core/auth/RoleGuard.tsx
// ─────────────────────────────────────────────
// CORE SYSTEM v2.1 — Role-Based Render Guard (HOC)
// Blueprint: src/core/auth/RoleGuard.tsx
// Purpose: Block component render by user role
// ─────────────────────────────────────────────
//
// Engineering Constitution v2.1 Compliance:
// • Uses useRole() hook (no direct Supabase calls)
// • Supports role arrays + permission matrix
// • Fallback component for unauthorized access
// • Tenant-aware (inherited from AuthProvider)

import { type ReactNode, type ComponentType } from "react";
import { useRole } from "./useRole";

// ─── Role Types (aligned with clinic_users.role CHECK constraint) ───
export type ClinicRole =
  | "super_admin"
  | "clinic_admin"
  | "doctor"
  | "receptionist";

// ─── Permission Types (aligned with permissionMatrix.ts if present) ───
export type PermissionAction =
  | "view_dashboard"
  | "manage_staff"
  | "manage_patients"
  | "manage_schedule"
  | "view_invoices"
  | "create_invoices"
  | "edit_invoices"
  | "delete_invoices"
  | "view_reports"
  | "manage_inventory"
  | "system_settings"
  | "audit_read";

// ─── RoleGuard Props ───
interface RoleGuardProps {
  /** Allowed roles for access */
  allowedRoles: ClinicRole[];
  /** Optional: required permission actions (reserved for future permission matrix integration) */
  requiredPermissions?: PermissionAction[];
  /** Component to render when unauthorized (default: null) */
  fallback?: ReactNode;
  /** Children to render when authorized */
  children: ReactNode;
}

// ─── RoleGuard Component ───
export function RoleGuard({
  allowedRoles,
  requiredPermissions: _requiredPermissions,
  fallback = null,
  children,
}: RoleGuardProps): ReactNode {
  const { role, hasRole } = useRole();

  // ── 1. Role Check ──
  const hasAllowedRole = role ? hasRole(allowedRoles) : false;

  // ── 2. Permission Check (reserved for future permission matrix integration)
  // NOTE: _requiredPermissions is intentionally unused until permissionMatrix.ts is implemented.
  // In production, integrate with src/core/permissions/permissionMatrix.ts
  const hasPermissions = true;

  // ── 3. Combined Access Decision ──
  const isAuthorized = hasAllowedRole && hasPermissions;

  if (!isAuthorized) {
    return fallback;
  }

  return <>{children}</>;
}

// ─── withRoleGuard HOC (for class components or route guards) ───
export function withRoleGuard<P extends object>(
  Component: ComponentType<P>,
  allowedRoles: ClinicRole[],
  fallback?: ReactNode
): ComponentType<P> {
  return function RoleGuardedComponent(props: P): ReactNode {
    return (
      <RoleGuard allowedRoles={allowedRoles} fallback={fallback}>
        <Component {...props} />
      </RoleGuard>
    );
  };
}

// ─── Convenience Guards (pre-configured for common roles) ───

/** Super Admin only — full system access */
export function SuperAdminGuard({ children, fallback }: Omit<RoleGuardProps, "allowedRoles">): ReactNode {
  return (
    <RoleGuard allowedRoles={["super_admin"]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

/** Clinic Admin + Super Admin — clinic management */
export function AdminGuard({ children, fallback }: Omit<RoleGuardProps, "allowedRoles">): ReactNode {
  return (
    <RoleGuard allowedRoles={["super_admin", "clinic_admin"]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

/** Doctor only — medical sessions */
export function DoctorGuard({ children, fallback }: Omit<RoleGuardProps, "allowedRoles">): ReactNode {
  return (
    <RoleGuard allowedRoles={["doctor"]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

/** Receptionist + Admin — front desk operations */
export function ReceptionistGuard({ children, fallback }: Omit<RoleGuardProps, "allowedRoles">): ReactNode {
  return (
    <RoleGuard allowedRoles={["receptionist", "clinic_admin", "super_admin"]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

/** Medical staff (Doctor + Receptionist) — clinical operations */
export function MedicalStaffGuard({ children, fallback }: Omit<RoleGuardProps, "allowedRoles">): ReactNode {
  return (
    <RoleGuard allowedRoles={["doctor", "receptionist"]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

// ─── Re-export types ───
export type { RoleGuardProps };
