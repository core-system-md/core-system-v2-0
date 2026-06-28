// ============================================================
// CORE SYSTEM v2.1 — useAuth Hook
// ALL Business Logic for Authentication lives here.
// AuthScreen.tsx is VIEW ONLY — NO supabase calls inside it.
// Constitution §9.6: PIN Auth — 4-digit PIN, rate limiting, hash verification.
// Constitution §9.5: JWT Claims — tenant_id + user_role injected.
// ============================================================

import { useCallback } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { 
  validateLicenseKey, 
  validatePin, 
  logPinAttempt,
  signOut as supabaseSignOut,
  getCurrentSession,
} from '@/infrastructure/supabase/client';
import type { UserRole } from '@/shared/types/auth';

/**
 * Type guard for error objects
 * Constitution §5: ALWAYS use types — NO any
 */
function isErrorWithMessage(err: unknown): err is { message: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as Record<string, unknown>).message === 'string'
  );
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (isErrorWithMessage(err)) return err.message;
  return fallback;
}

export function useAuth() {
  // ── Destructure store to avoid stale closure issues ──
  const store = useAuthStore();
  
  // Use individual selectors to prevent unnecessary re-renders
  // and avoid stale closure issues with useCallback
  const setLoading = useAuthStore((s) => s.setLoading);
  const setError = useAuthStore((s) => s.setError);
  const setStatus = useAuthStore((s) => s.setStatus);
  const setTenant = useAuthStore((s) => s.setTenant);
  const setUser = useAuthStore((s) => s.setUser);
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const resetPinAttempts = useAuthStore((s) => s.resetPinAttempts);
  const incrementPinAttempt = useAuthStore((s) => s.incrementPinAttempt);
  const logoutStore = useAuthStore((s) => s.logout);
  const clearErrorStore = useAuthStore((s) => s.clearError);

  // ── License Validation ──
  // Step 1: User enters License Key → validate → get tenant_id
  const validateLicense = useCallback(async (licenseKey: string) => {
    // Input validation
    const trimmedKey = licenseKey.trim();
    if (!trimmedKey) {
      setError('مفتاح الترخيص مطلوب.');
      setStatus('error');
      return { success: false, error: 'EMPTY_LICENSE_KEY' };
    }

    setLoading(true);
    setError(null);
    setStatus('validating_license');

    try {
      const result = await validateLicenseKey(trimmedKey);
      
      // Defensive: validate RPC response shape
      if (!result || typeof result !== 'object' || !('tenant_id' in result)) {
        throw new Error('INVALID_LICENSE');
      }

      const tenantId = (result as Record<string, unknown>).tenant_id;
      if (!tenantId || typeof tenantId !== 'string') {
        throw new Error('INVALID_LICENSE');
      }

      // Store tenant_id in AuthStore (Single Source)
      setTenant(tenantId as string, {
        tenant_id: tenantId as string,
        license_key: trimmedKey,
        clinic_name: String((result as Record<string, unknown>).clinic_name || ''),
        subscription_tier: String((result as Record<string, unknown>).subscription_tier || 'trial'),
        is_valid: true,
      });

      setStatus('license_valid');
      return { success: true, tenant_id: tenantId as string };
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'INVALID_LICENSE') === 'INVALID_LICENSE'
        ? 'مفتاح الترخيص غير صالح. يرجى التحقق والمحاولة مرة أخرى.'
        : getErrorMessage(err, 'حدث خطأ أثناء التحقق من الترخيص.');
      
      setError(message);
      setStatus('error');
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setStatus, setTenant]);

  // ── PIN Login ──
  // Step 2: User enters 4-digit PIN → validate via RPC → get user + role
  // Constitution §9.6: validate_pin RPC returns TABLE(id, full_name, role, tenant_id)
  const loginWithPin = useCallback(async (pinCode: string) => {
    const tenantId = store.tenant_id;

    if (!tenantId) {
      setError('معرف المستأجر مفقود. يرجى إدخال مفتاح الترخيص أولاً.');
      return { success: false, error: 'MISSING_TENANT_ID' };
    }

    // Input validation: PIN must be exactly 4 digits
    const trimmedPin = pinCode.trim();
    if (!/^\d{4}$/.test(trimmedPin)) {
      setError('رمز PIN يجب أن يكون 4 أرقام.');
      return { success: false, error: 'INVALID_PIN_FORMAT' };
    }

    // Rate limiting check
    const pinLockedUntil = store.pinLockedUntil;
    if (pinLockedUntil && Date.now() < pinLockedUntil) {
      const remaining = Math.ceil((pinLockedUntil - Date.now()) / 60000);
      setError(`تم قفل المحاولات. يرجى الانتظار ${remaining} دقيقة.`);
      return { success: false, error: 'PIN_LOCKED' };
    }

    setLoading(true);
    setError(null);
    setStatus('authenticating_pin');

    try {
      // Validate PIN via RPC
      // RETURNS TABLE(id uuid, full_name text, role text, tenant_id uuid)
      const userData = await validatePin(tenantId, trimmedPin);

      if (!userData || !userData.id) {
        throw new Error('INVALID_PIN');
      }

      // Verify tenant match (security)
      if (userData.tenant_id !== tenantId) {
        throw new Error('TENANT_MISMATCH');
      }

      // Reset PIN attempts on success
      resetPinAttempts();

      // Set user in store (Single Source of Session)
      setUser({
        id: userData.id,
        full_name: userData.full_name,
        role: userData.role as UserRole,
        tenant_id: userData.tenant_id,
      });

      setStatus('authenticated');
      setAuthenticated(true);

      // Log successful attempt (fire-and-forget with error handling)
      logPinAttempt(tenantId, trimmedPin, true).catch((err: unknown) => {
        console.error('Failed to log PIN success:', getErrorMessage(err, 'Unknown error'));
      });

      return { 
        success: true, 
        user: {
          id: userData.id,
          full_name: userData.full_name,
          role: userData.role,
          tenant_id: userData.tenant_id,
        }
      };
    } catch (err: unknown) {
      // Log failed attempt (fire-and-forget with error handling)
      logPinAttempt(tenantId, trimmedPin, false).catch((logErr: unknown) => {
        console.error('Failed to log PIN failure:', getErrorMessage(logErr, 'Unknown error'));
      });
      
      incrementPinAttempt();

      const errMessage = getErrorMessage(err, 'UNKNOWN_ERROR');
      const message = errMessage === 'INVALID_PIN'
        ? 'رمز PIN غير صحيح. يرجى المحاولة مرة أخرى.'
        : errMessage === 'TENANT_MISMATCH'
        ? 'خطأ في بيانات المستأجر. يرجى التواصل مع الدعم.'
        : errMessage || 'حدث خطأ أثناء تسجيل الدخول.';

      setError(message);
      setStatus('error');
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [store.tenant_id, store.pinLockedUntil, setLoading, setError, setStatus, setUser, setAuthenticated, resetPinAttempts, incrementPinAttempt]);

  // ── Logout ──
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await supabaseSignOut();
    } catch (err: unknown) {
      console.error('Supabase signOut error:', getErrorMessage(err, 'Unknown error'));
    } finally {
      logoutStore();
      // Clear any legacy keys (cleanup)
      localStorage.removeItem('core_pin_auth');
      localStorage.removeItem('pin_auth');
      localStorage.removeItem('auth');
      localStorage.removeItem('session');
    }
  }, [setLoading, logoutStore]);

  // ── Session Sync ──
  // Verify Supabase session matches our store (prevent drift)
  const syncSession = useCallback(async () => {
    try {
      const session = await getCurrentSession();
      if (!session && store.isAuthenticated) {
        // Supabase session expired but store says authenticated → logout
        logoutStore();
      }
    } catch (err: unknown) {
      console.error('Session sync error:', getErrorMessage(err, 'Unknown error'));
    }
  }, [store.isAuthenticated, logoutStore]);

  return {
    // State (read-only)
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    status: store.status,
    tenant_id: store.tenant_id,
    license: store.license,
    pinAttempts: store.pinAttempts,
    pinLockedUntil: store.pinLockedUntil,
    
    // Actions
    validateLicense,
    loginWithPin,
    logout,
    syncSession,
    clearError: clearErrorStore,
  };
}
