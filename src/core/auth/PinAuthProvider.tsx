// src/core/auth/PinAuthProvider.tsx
// UPDATED: 2026-06-24 — Fixed validate_pin params (p_pin + p_role)

import React, { createContext, useContext, useCallback, useState } from 'react';
import { supabase } from '../../infrastructure/supabase/client';

interface PinAuthContextType {
  verifyPin: (params: PinVerificationParams) => Promise<PinVerificationResult>;
  isVerifying: boolean;
  lastError: string | null;
  clearError: () => void;
}

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

interface PinAttemptLog {
  tenantId: string;
  attemptedPin: string;
  success: boolean;
  userId?: string;
  role?: string;
}

const PinAuthContext = createContext<PinAuthContextType | null>(null);
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export function PinAuthProvider({ children }: { children: React.ReactNode }) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const logPinAttempt = useCallback(async (log: PinAttemptLog) => {
    try {
      await supabase.from('pin_attempt_log').insert({
        tenant_id: log.tenantId,
        attempted_pin: log.attemptedPin,
        success: log.success,
        user_id: log.userId,
        role: log.role,
        attempted_at: new Date().toISOString(),
      });
    } catch { /* Silent fail */ }
  }, []);

  const checkRateLimit = useCallback(async (tenantId: string, pinCode: string): Promise<boolean> => {
    const { data: attempts } = await supabase
      .from('pin_attempt_log')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('attempted_pin', pinCode)
      .eq('success', false)
      .gte('attempted_at', new Date(Date.now() - LOCKOUT_DURATION_MS).toISOString())
      .order('attempted_at', { ascending: false })
      .limit(MAX_ATTEMPTS);
    return (attempts?.length || 0) >= MAX_ATTEMPTS;
  }, []);

  const performPinVerification = useCallback(
    async (pinCode: string, tenantId: string, _userId: string | undefined, _employeeCode: string | undefined, role: string): Promise<PinVerificationResult> => {
      const isLocked = await checkRateLimit(tenantId, pinCode);
      if (isLocked) {
        await logPinAttempt({ tenantId, attemptedPin: pinCode, success: false, role });
        return { success: false, error: 'ACCOUNT_LOCKED: Too many failed attempts. Try again in 15 minutes.' };
      }

      const validRoles = ['doctor', 'receptionist', 'clinic_admin', 'super_admin'];
      if (!validRoles.includes(role)) {
        await logPinAttempt({ tenantId, attemptedPin: pinCode, success: false, role });
        return { success: false, error: 'INVALID_ROLE: Role must be one of: doctor, receptionist, clinic_admin, super_admin' };
      }

      const { data: pinResult, error: pinError } = await supabase.rpc('validate_pin', {
        params: { p_tenant_id: tenantId, p_pin: pinCode, p_role: role },
      });

      if (pinError) {
        await logPinAttempt({ tenantId, attemptedPin: pinCode, success: false, role });
        return { success: false, error: `INVALID_PIN: ${pinError.message}` };
      }

      const pinData = pinResult as any;
      if (!pinData?.success) {
        await logPinAttempt({ tenantId, attemptedPin: pinCode, success: false, role });
        return { success: false, error: `INVALID_PIN: ${pinData?.message || 'Incorrect PIN code'}` };
      }

      await logPinAttempt({ tenantId, attemptedPin: pinCode, success: true, userId: pinData.user_id, role: pinData.role });
      return { success: true, userId: pinData.user_id, fullName: pinData.full_name, role: pinData.role, employeeCode: pinData.employee_code };
    }, [checkRateLimit, logPinAttempt],
  );

  const verifyPin = useCallback(async (params: PinVerificationParams): Promise<PinVerificationResult> => {
    setIsVerifying(true);
    setLastError(null);
    try {
      if (!params.pinCode?.trim()) return { success: false, error: 'PIN_REQUIRED' };
      if (!params.tenantId?.trim()) return { success: false, error: 'TENANT_REQUIRED' };
      if (!params.role?.trim()) return { success: false, error: 'ROLE_REQUIRED' };

      const result = await performPinVerification(params.pinCode.trim(), params.tenantId.trim(), params.userId, params.employeeCode, params.role.trim());
      if (!result.success) setLastError(result.error || 'Verification failed');
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setLastError(msg);
      return { success: false, error: msg };
    } finally { setIsVerifying(false); }
  }, [performPinVerification]);

  const clearError = useCallback(() => { setLastError(null); }, []);

  return (
    <PinAuthContext.Provider value={{ verifyPin, isVerifying, lastError, clearError }}>
      {children}
    </PinAuthContext.Provider>
  );
}

export function usePinAuth(): PinAuthContextType {
  const context = useContext(PinAuthContext);
  if (!context) throw new Error('usePinAuth must be used within PinAuthProvider');
  return context;
}