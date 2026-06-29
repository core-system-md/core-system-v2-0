// ============================================================
// CORE SYSTEM v2.1 — Auth Types
// Constitution §5: ALWAYS use types — NO any
// ============================================================

export type UserRole = 'super_admin' | 'clinic_admin' | 'doctor' | 'receptionist';

export type AuthStatus = 
  | 'idle' 
  | 'validating_license' 
  | 'license_valid' 
  | 'authenticating_pin' 
  | 'authenticated' 
  | 'error';

export interface AuthUser {
  id: string;
  full_name: string;
  role: UserRole;
  tenant_id: string;
  email?: string;
}

export interface LicenseValidationResult {
  tenant_id: string;
  license_key: string;
  clinic_name: string;
  subscription_tier: string;
  is_valid: boolean;
}
