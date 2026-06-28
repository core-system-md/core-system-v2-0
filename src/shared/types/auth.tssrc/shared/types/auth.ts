// ============================================================
// CORE SYSTEM v2.1 — Authentication Types
// Immutable — aligned with Constitution §6, §9.6
// ============================================================

export type UserRole = 'super_admin' | 'clinic_admin' | 'doctor' | 'receptionist';

export interface AuthUser {
  id: string;
  full_name: string;
  role: UserRole;
  tenant_id: string;
  email?: string;
  employee_code?: string;
}

export interface AuthSession {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LicenseValidationResult {
  tenant_id: string;
  license_key: string;
  clinic_name: string;
  subscription_tier: string;
  is_valid: boolean;
}

export interface PinLoginResult {
  id: string;
  full_name: string;
  role: UserRole;
  tenant_id: string;
}

export type AuthStatus = 
  | 'idle' 
  | 'validating_license' 
  | 'license_valid' 
  | 'authenticating_pin' 
  | 'authenticated' 
  | 'error';
