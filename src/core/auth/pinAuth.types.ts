// src/core/auth/pinAuth.types.ts
// UPDATED: 2026-06-24 — Added all types for migration 030 compatibility

export interface PinVerificationParams {
  pinCode: string;
  tenantId: string;
  userId?: string;
  employeeCode?: string;
  role: string;
}

export interface PinVerificationResult {
  success: boolean;
  userId?: string;
  fullName?: string;
  role?: string;
  employeeCode?: string;
  error?: string;
}

// Aliases for backward compatibility with index.ts
export type PinValidationResult = PinVerificationResult;
export type PinVerifyParams = PinVerificationParams;

export interface PinAttemptLog {
  tenantId: string;
  attemptedPin: string;
  success: boolean;
  userId?: string;
  role?: string;
}

export enum PinErrorCode {
  PIN_REQUIRED = 'PIN_REQUIRED',
  TENANT_REQUIRED = 'TENANT_REQUIRED',
  ROLE_REQUIRED = 'ROLE_REQUIRED',
  INVALID_ROLE = 'INVALID_ROLE',
  INVALID_PIN = 'INVALID_PIN',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface EmployeeCodeVerifyParams {
  employeeCode: string;
  tenantId: string;
  role: string;
}

export type KioskRole = 'doctor' | 'receptionist' | 'clinic_admin' | 'super_admin';