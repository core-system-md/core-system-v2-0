// src/core/auth/PinAuthProvider.tsx
// ─────────────────────────────────────────────
// CORE SYSTEM v2.1 — 4-Digit PIN Fast-Switch (Kiosk Mode)
// Blueprint: src/core/auth/PinAuthProvider.tsx
// Purpose: Secure PIN authentication for Ambient Kiosk
// ─────────────────────────────────────────────
//
// Engineering Constitution v2.1 Compliance:
// • tenant_id isolation enforced
// • pin_hash verification (Migration 018)
// • Rate limiting via pin_attempt_log (Migration 019)
// • is_active + role validation
// • employee_code lookup support
// • Uses database.types.ts (no any)
// • Fast-switch: tap avatar → PIN prompt → switch user

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { supabase } from "../../infrastructure/supabase/client";
import type { Database } from "../../infrastructure/supabase/database.types";

// ─── Type Aliases from Database ───
type ClinicUserRow = Database["public"]["Tables"]["clinic_users"]["Row"];
type PinAttemptLogInsert = Database["public"]["Tables"]["pin_attempt_log"]["Insert"];

// ─── PIN Validation Result ───
interface PinValidationResult {
  success: boolean;
  user: Pick<ClinicUserRow, "id" | "full_name" | "full_name_ar" | "role" | "employee_code" | "tenant_id"> | null;
  errorCode: PinErrorCode | null;
  attemptsRemaining: number;
}

type PinErrorCode =
  | "INVALID_CREDENTIALS"
  | "RATE_LIMITED"
  | "ACCOUNT_INACTIVE"
  | "ROLE_UNAUTHORIZED"
  | "SYSTEM_ERROR"
  | "TENANT_MISMATCH";

// ─── Context Value Interface ───
interface PinAuthContextValue {
  isPinVerified: boolean;
  isPinVerifying: boolean;
  lastUserId: string | null;
  lastUserName: string | null;
  lastUserRole: string | null;
  lastError: string | null;
  attemptsRemaining: number;
  verifyPin: (params: PinVerifyParams) => Promise<PinValidationResult>;
  verifyPinByEmployeeCode: (params: EmployeeCodeVerifyParams) => Promise<PinValidationResult>;
  clearPin: () => void;
  switchUser: () => void;
}

interface PinVerifyParams {
  pinCode: string;
  tenantId: string;
  userId?: string;
  employeeCode?: string;
}

interface EmployeeCodeVerifyParams {
  employeeCode: string;
  pinCode: string;
  tenantId: string;
}

const PinAuthContext = createContext<PinAuthContextValue | undefined>(undefined);

// ─── Constants ───
const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_MINUTES = 15;
const KIOSK_ALLOWED_ROLES = ["doctor", "receptionist"] as const;
type KioskRole = typeof KIOSK_ALLOWED_ROLES[number];

// ─── Helper: Check if role is kiosk-allowed ───
function isKioskRole(role: string | null): role is KioskRole {
  return role !== null && KIOSK_ALLOWED_ROLES.includes(role as KioskRole);
}

// ─── Helper: Log PIN attempt ───
async function logPinAttempt(params: {
  tenantId: string;
  attemptedPin: string;
  success: boolean;
  ipAddress?: string;
}): Promise<void> {
  try {
    const logEntry: PinAttemptLogInsert = {
      tenant_id: params.tenantId,
      attempted_pin: params.attemptedPin,
      success: params.success,
      ip_address: params.ipAddress ?? null,
      created_at: new Date().toISOString(),
    };

    await supabase.from("pin_attempt_log").insert(logEntry);
  } catch {
    // Fail silently — logging should not block auth flow
  }
}

// ─── Provider ───
export function PinAuthProvider({ children }: { children: React.ReactNode }) {
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [isPinVerifying, setIsPinVerifying] = useState(false);
  const [lastUserId, setLastUserId] = useState<string | null>(null);
  const [lastUserName, setLastUserName] = useState<string | null>(null);
  const [lastUserRole, setLastUserRole] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(MAX_PIN_ATTEMPTS);

  const currentTenantIdRef = useRef<string | null>(null);

  // ─── Core PIN Verification Logic ───
  const performPinVerification = useCallback(async (
    pinCode: string,
    tenantId: string,
    userId?: string,
    employeeCode?: string
  ): Promise<PinValidationResult> => {
    setIsPinVerifying(true);
    setLastError(null);

    try {
      // ── 1. Rate Limit Check ──
      const { data: recentAttempts, error: rateError } = await supabase
        .from("pin_attempt_log")
        .select("created_at, success")
        .eq("tenant_id", tenantId)
        .eq("attempted_pin", pinCode)
        .gte("created_at", new Date(Date.now() - PIN_LOCKOUT_MINUTES * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(MAX_PIN_ATTEMPTS);

      if (rateError) {
        await logPinAttempt({ tenantId, attemptedPin: pinCode, success: false });
        return {
          success: false,
          user: null,
          errorCode: "SYSTEM_ERROR",
          attemptsRemaining: 0,
        };
      }

      const failedAttempts = (recentAttempts || []).filter(a => !a.success).length;
      const remaining = Math.max(0, MAX_PIN_ATTEMPTS - failedAttempts);

      if (remaining <= 0) {
        await logPinAttempt({ tenantId, attemptedPin: pinCode, success: false });
        setAttemptsRemaining(0);
        setLastError(`Account locked. Try again in ${PIN_LOCKOUT_MINUTES} minutes.`);
        return {
          success: false,
          user: null,
          errorCode: "RATE_LIMITED",
          attemptsRemaining: 0,
        };
      }

      // ── 2. Build Query ──
      let query = supabase
        .from("clinic_users")
        .select("id, full_name, full_name_ar, role, employee_code, tenant_id, is_active, pin_hash")
        .eq("tenant_id", tenantId);

      if (userId) {
        query = query.eq("id", userId);
      } else if (employeeCode) {
        query = query.eq("employee_code", employeeCode);
      } else {
        return {
          success: false,
          user: null,
          errorCode: "INVALID_CREDENTIALS",
          attemptsRemaining: remaining,
        };
      }

      const { data: userRows, error: userError } = await query.single();

      if (userError || !userRows) {
        await logPinAttempt({ tenantId, attemptedPin: pinCode, success: false });
        setAttemptsRemaining(remaining - 1);
        setLastError("Invalid PIN or employee code.");
        return {
          success: false,
          user: null,
          errorCode: "INVALID_CREDENTIALS",
          attemptsRemaining: remaining - 1,
        };
      }

      // ── 3. Validate is_active ──
      if (!userRows.is_active) {
        await logPinAttempt({ tenantId, attemptedPin: pinCode, success: false });
        setLastError("Account is deactivated. Contact clinic admin.");
        return {
          success: false,
          user: null,
          errorCode: "ACCOUNT_INACTIVE",
          attemptsRemaining: remaining,
        };
      }

      // ── 4. Validate Role (Kiosk-only roles) ──
      if (!isKioskRole(userRows.role)) {
        await logPinAttempt({ tenantId, attemptedPin: pinCode, success: false });
        setLastError("This account is not authorized for kiosk access.");
        return {
          success: false,
          user: null,
          errorCode: "ROLE_UNAUTHORIZED",
          attemptsRemaining: remaining,
        };
      }

      // ── 5. Verify PIN Hash ──
      const { data: verifyResult, error: verifyError } = await supabase
        .rpc("verify_pin_hash", {
          p_pin_hash: userRows.pin_hash,
          p_pin_code: pinCode,
        });

      if (verifyError || !verifyResult) {
        await logPinAttempt({ tenantId, attemptedPin: pinCode, success: false });
        setAttemptsRemaining(remaining - 1);
        setLastError("Invalid PIN code.");
        return {
          success: false,
          user: null,
          errorCode: "INVALID_CREDENTIALS",
          attemptsRemaining: remaining - 1,
        };
      }

      // ── 6. Success ──
      await logPinAttempt({ tenantId, attemptedPin: pinCode, success: true });

      setIsPinVerified(true);
      setLastUserId(userRows.id);
      setLastUserName(userRows.full_name);
      setLastUserRole(userRows.role);
      setAttemptsRemaining(MAX_PIN_ATTEMPTS);
      setLastError(null);
      currentTenantIdRef.current = tenantId;

      return {
        success: true,
        user: {
          id: userRows.id,
          full_name: userRows.full_name,
          full_name_ar: userRows.full_name_ar,
          role: userRows.role,
          employee_code: userRows.employee_code,
          tenant_id: userRows.tenant_id,
        },
        errorCode: null,
        attemptsRemaining: MAX_PIN_ATTEMPTS,
      };

    } catch (err) {
      console.error("[PinAuthProvider] Verification error:", err);
      setLastError("System error. Please try again.");
      return {
        success: false,
        user: null,
        errorCode: "SYSTEM_ERROR",
        attemptsRemaining: 0,
      };
    } finally {
      setIsPinVerifying(false);
    }
  }, []);

  // ─── Public: verifyPin ───
  const verifyPin = useCallback(async (params: PinVerifyParams): Promise<PinValidationResult> => {
    return performPinVerification(params.pinCode, params.tenantId, params.userId, params.employeeCode);
  }, [performPinVerification]);

  // ─── Public: verifyPinByEmployeeCode ───
  const verifyPinByEmployeeCode = useCallback(async (params: EmployeeCodeVerifyParams): Promise<PinValidationResult> => {
    return performPinVerification(params.pinCode, params.tenantId, undefined, params.employeeCode);
  }, [performPinVerification]);

  // ─── Public: clearPin (logout from kiosk) ───
  const clearPin = useCallback(() => {
    setIsPinVerified(false);
    setLastUserId(null);
    setLastUserName(null);
    setLastUserRole(null);
    setLastError(null);
    setAttemptsRemaining(MAX_PIN_ATTEMPTS);
    currentTenantIdRef.current = null;
  }, []);

  // ─── Public: switchUser (fast-switch) ───
  const switchUser = useCallback(() => {
    setIsPinVerified(false);
    setLastUserId(null);
    setLastUserName(null);
    setLastUserRole(null);
    setLastError(null);
    setAttemptsRemaining(MAX_PIN_ATTEMPTS);
  }, []);

  const value: PinAuthContextValue = {
    isPinVerified,
    isPinVerifying,
    lastUserId,
    lastUserName,
    lastUserRole,
    lastError,
    attemptsRemaining,
    verifyPin,
    verifyPinByEmployeeCode,
    clearPin,
    switchUser,
  };

  return (
    <PinAuthContext.Provider value={value}>
      {children}
    </PinAuthContext.Provider>
  );
}

// ─── Hook: usePinAuth ───
export function usePinAuth(): PinAuthContextValue {
  const ctx = useContext(PinAuthContext);
  if (!ctx) {
    throw new Error("[usePinAuth] Must be used within <PinAuthProvider>");
  }
  return ctx;
}

// ─── Re-export types ───
export type { PinValidationResult, PinErrorCode, PinVerifyParams, EmployeeCodeVerifyParams, KioskRole };
