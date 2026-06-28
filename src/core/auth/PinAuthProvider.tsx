// ============================================================
// CORE SYSTEM v2.1 — PinAuthProvider
// Kiosk Mode: 4-digit PIN fast-switch between staff members.
// Constitution §9.6: PIN Auth — 4-digit PIN, hash verification, rate limiting.
//
// CRITICAL RULE: PinAuthProvider does NOT create an independent session.
// It COMPLETES the existing session by setting the user in AuthStore.
// The session source remains: AuthStore → AuthProvider → Supabase.
//
// Flow:
//   1. License validated → tenant_id stored in AuthStore
//   2. User taps avatar → PinPadOverlay opens
//   3. User enters 4-digit PIN → validate_pin RPC
//   4. On success → user set in AuthStore → session complete
//   5. All queries use tenant_id from AuthStore (single source)
// ============================================================

import { useCallback, createContext, useContext } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { validatePin, logPinAttempt } from '@/infrastructure/supabase/client';
import type { UserRole } from '@/shared/types/auth';

interface PinAuthContextValue {
  authenticatePin: (pinCode: string) => Promise<{ success: boolean; error?: string; user?: any }>;
  switchUser: () => void;
}

const PinAuthContext = createContext<PinAuthContextValue | null>(null);

interface PinAuthProviderProps {
  children: React.ReactNode;
}

export function PinAuthProvider({ children }: PinAuthProviderProps) {
  const store = useAuthStore();

  /**
   * Authenticate with 4-digit PIN.
   * This is a CONVENIENCE WRAPPER around useAuth.loginWithPin.
   * It exists to provide a dedicated context for Kiosk UI components.
   */
  const authenticatePin = useCallback(async (pinCode: string) => {
    const tenantId = store.tenant_id;

    if (!tenantId) {
      return { 
        success: false, 
        error: 'معرف المستأجر مفقود. يرجى إدخال مفتاح الترخيص أولاُ.' 
      };
    }

    // Rate limiting check
    if (store.pinLockedUntil && Date.now() < store.pinLockedUntil) {
      const remaining = Math.ceil((store.pinLockedUntil - Date.now()) / 60000);
      return { 
        success: false, 
        error: `تم قفل المحاولات. يرجى الانتظار ${remaining} دقيقة.` 
      };
    }

    try {
      // Call validate_pin RPC
      // RETURNS TABLE(id uuid, full_name text, role text, tenant_id uuid)
      const userData = await validatePin(tenantId, pinCode);

      if (!userData?.id) {
        throw new Error('INVALID_PIN');
      }

      // Security: Verify tenant match
      if (userData.tenant_id !== tenantId) {
        throw new Error('TENANT_MISMATCH');
      }

      // Reset attempts on success
      store.resetPinAttempts();

      // Set user in AuthStore (completes the session)
      store.setUser({
        id: userData.id,
        full_name: userData.full_name,
        role: userData.role as UserRole,
        tenant_id: userData.tenant_id,
      });

      store.setStatus('authenticated');
      store.setAuthenticated(true);

      // Log success
      await logPinAttempt(tenantId, pinCode, true);

      return { success: true, user: userData };
    } catch (err: any) {
      // Log failure
      await logPinAttempt(tenantId, pinCode, false);
      store.incrementPinAttempt();

      const message = err.message === 'INVALID_PIN'
        ? 'رمز PIN غير صحيح.'
        : err.message === 'TENANT_MISMATCH'
        ? 'خطأ في بيانات المستأجر.'
        : err.message || 'حدث خطأ أثناء التحقق من PIN.';

      return { success: false, error: message };
    }
  }, [store]);

  /**
   * Quick-switch: Logout current user but keep tenant/license.
   * Used in Kiosk mode when staff member taps "Switch User".
   */
  const switchUser = useCallback(() => {
    // Keep tenant_id and license, clear user only
    store.setUser(null);
    store.setAuthenticated(false);
    store.setStatus('license_valid');
    store.resetPinAttempts();
  }, [store]);

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
