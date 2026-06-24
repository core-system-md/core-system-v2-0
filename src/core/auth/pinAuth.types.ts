// src/core/auth/pinAuth.types.ts
// UPDATED: 2026-06-24 — Added role as required field

export interface PinVerificationParams {
  pinCode: string;
  tenantId: string;
  userId?: string;
  employeeCode?: string;
  role: string; // ← REQUIRED: doctor, receptionist, clinic_admin, super_admin
}

export interface PinVerificationResult {
  success: boolean;
  userId?: string;
  fullName?: string;
  role?: string;
  employeeCode?: string;
  error?: string;
}

export interface PinAttemptLog {
  tenantId: string;
  attemptedPin: string;
  success: boolean;
  userId?: string;
  role?: string;
}