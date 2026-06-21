// src/core/auth/index.ts
// ─────────────────────────────────────────────
// CORE SYSTEM v2.1 — Auth Module Public API
// Blueprint: src/core/auth/index.ts
// Purpose: Centralized exports for auth layer
// ─────────────────────────────────────────────

// ─── Providers ───
export { AuthProvider, useAuthContext } from "./AuthProvider";
// export { PinAuthProvider, usePinAuth } from "./pinAuth.types"; // TODO: Enable when verify_pin_hash RPC + pin_hash column exist

// ─── Hooks ───
export { useAuth } from "./useAuth";
export { useRole } from "./useRole";

// ─── Guards ───
export {
  RoleGuard,
  withRoleGuard,
  SuperAdminGuard,
  AdminGuard,
  DoctorGuard,
  ReceptionistGuard,
  MedicalStaffGuard,
} from "./RoleGuard";

// ─── Types ───
// NOTE: PermissionAction is intentionally excluded here.
// It is the canonical export from src/core/permissions/permissionMatrix.ts
// to avoid duplicate export ambiguity in src/core/index.ts

export type {
  ClinicRole,
  RoleGuardProps,
} from "./RoleGuard";

export type {
  PinValidationResult,
  PinErrorCode,
  PinVerifyParams,
  EmployeeCodeVerifyParams,
  KioskRole,
} from "./pinAuth.types";
