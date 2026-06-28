// ============================================================
// CORE SYSTEM v2.1 — PinAuthProvider
// Kiosk Mode: 4-digit PIN fast-switch between staff members.
// Constitution §9.6: PIN Auth — 4-digit PIN, hash verification, rate limiting.
//
// CRITICAL RULE: PinAuthProvider does NOT create an independent session.
// It COMPLETES the existing session by setting the user in AuthStore.
// The session source remains: AuthStore → AuthProvider → Supabase.
//
// ARCHITECTURE NOTE: This is a THIN WRAPPER around useAuth.loginWithPin.
// It exists ONLY to provide a dedicated context for Kiosk UI components.
// ALL business logic lives in useAuth.ts — DO NOT duplicate here.
//
// Flow:
//   1. License validated → tenant_id stored in AuthStore
//   2. User taps avatar → PinPadOverlay opens
//   3. User enters 4-digit PIN → validate_pin RPC (via useAuth)
//   4. On success → user set in AuthStore → session complete
//   5. All queries use tenant_id from AuthStore (single source)
// ============================================================

import { useCallback, createContext, useContext } from 'react';
import { useAuth } from '@/core/auth/useAuth';
import { useAuthStore } from '@/shared/store/authStore';
import type { PinLoginResult } from '@/shared/types/auth';

interface PinAuthContextValue {
  authenticatePin: (pinCode: string) => Promise<{ 
    success: boolean; 
    error?: string; 
    user?: PinLoginResult 
  }>;
  switchUser: () => void;
}

const PinAuthContext = createContext<PinAuthContextValue | null>(null);

interface PinAuthProviderProps {
  children: React.ReactNode;
}

// ── Error Helper ──
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

export function PinAuthProvider({ children }: PinAuthProviderProps) {
  // ── Delegate ALL business logic to useAuth ──
  const { loginWithPin } = useAuth();

  /**
   * Authenticate with 4-digit PIN.
   * THIN WRAPPER around useAuth.loginWithPin.
   * Adds kiosk-specific UX: isLoading management + error formatting.
   */
  const authenticatePin = useCallback(async (pinCode: string) => {
    const store = useAuthStore.getState();
    const tenantId = store.tenant_id;

    if (!tenantId) {
      return { 
        success: false, 
        error: 'معرف المستأجر مفقود. يرجى إدخال مفتاح الترخيص أولاً.' 
      };
    }

    // Rate limiting check (read from store directly)
    const pinLockedUntil = store.pinLockedUntil;
    if (pinLockedUntil && Date.now() < pinLockedUntil) {
      const remaining = Math.ceil((pinLockedUntil - Date.now()) / 60000);
      return { 
        success: false, 
        error: `تم قفل المحاولات. يرجى الانتظار ${remaining} دقيقة.` 
      };
    }

    // Input validation
    const trimmedPin = pinCode.trim();
    if (!/^\d{4}$/.test(trimmedPin)) {
      return {
        success: false,
        error: 'رمز PIN يجب أن يكون 4 أرقام.',
      };
    }

    // Delegate to useAuth (single source of business logic)
    store.setLoading(true);
    store.setError(null);

    try {
      const result = await loginWithPin(trimmedPin);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'فشل في التحقق من PIN.',
        };
      }

      return {
        success: true,
        user: result.user,
      };
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'حدث خطأ أثناء التحقق من PIN.');
      return { success: false, error: message };
    } finally {
      store.setLoading(false);
    }
  }, [loginWithPin]);

  /**
   * Quick-switch: Logout current user but keep tenant/license.
   * Used in Kiosk mode when staff member taps "Switch User".
   */
  const switchUser = useCallback(() => {
    const store = useAuthStore.getState();
    // Keep tenant_id and license, clear user only
    store.setUser(null);
    store.setAuthenticated(false);
    store.setStatus('license_valid');
    store.resetPinAttempts();
    store.clearError();
  }, []);

  return (
    <PinAuthContext.Provider value={{ authenticatePin, switchUser }}>
      {children}
    </PinAuthContext.Provider>
  );
}

export function usePinAuth() {
  const ctx = useContext(PinAuthContext);
  if (!ctx) {
    throw new Error('usePinAuth must be used within PinAuthProvider');
  }
  return ctx;
}
