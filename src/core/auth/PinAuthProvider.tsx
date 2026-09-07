import { useCallback } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { supabase } from '@/infrastructure/supabase/client';
import type { AuthUser } from '@/shared/store/authStore';

const PIN_SESSION_STORAGE_KEY = 'core-system-pin-session';

export function PinAuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function usePinAuth() {
  const store = useAuthStore();

  const validatePin = useCallback(
    async (employeeCode: string, pin: string, tenantId: string) => {
      store.startChecking();
      store.setError(null);

      try {
        const { data: sessionData, error: sessionError } = await supabase.rpc('create_pin_session', {
          p_tenant_id: tenantId,
          p_employee_code: employeeCode,
          p_pin: pin,
        });

        if (sessionError) {
          store.setError(sessionError.message);
          store.unauthenticate();
          store.incrementPinAttempt();
          return { success: false, error: sessionError.message };
        }

        const sessionResult = sessionData as any;
        if (!sessionResult?.success || !sessionResult.session_token) {
          const msg = sessionResult?.error === 'RATE_LIMIT_EXCEEDED'
            ? 'Too many PIN attempts. Try again later.'
            : 'Invalid PIN or employee code';
          store.setError(msg);
          store.unauthenticate();
          store.incrementPinAttempt();
          return { success: false, error: msg };
        }

        store.resetPinAttempts();
        sessionStorage.setItem(PIN_SESSION_STORAGE_KEY, sessionResult.session_token);

        const authUser: AuthUser = {
          id: sessionResult.user_id,
          email: sessionResult.email ?? null,
          full_name: sessionResult.full_name ?? '',
          full_name_ar: sessionResult.full_name_ar ?? null,
          role: (sessionResult.role as AuthUser['role']) || 'receptionist',
          tenant_id: sessionResult.tenant_id ?? tenantId,
          employee_code: sessionResult.employee_code ?? employeeCode,
          pin_code: null,
          phone: sessionResult.phone ?? null,
          specialization: sessionResult.specialization ?? null,
        };

        // PIN authentication is intentionally separate from Supabase Auth.
        // The secure PIN session token is used only by server-verified PIN RPCs.
        store.login(authUser, null, null);
        store.setPinAuthenticated(true);

        return { success: true, user: authUser };
      } catch (err: any) {
        const msg = err?.message || 'PIN validation failed';
        store.setError(msg);
        store.unauthenticate();
        store.incrementPinAttempt();
        return { success: false, error: msg };
      }
    },
    [store]
  );

  const switchUser = useCallback(
    async (employeeCode: string, pin: string, tenantId: string) => {
      sessionStorage.removeItem(PIN_SESSION_STORAGE_KEY);
      store.setUser(null);
      store.setSupabaseUser(null);
      store.setSession(null);
      store.setPinAuthenticated(false);
      store.boot();
      store.resetPinAttempts();
      return validatePin(employeeCode, pin, tenantId);
    },
    [store, validatePin]
  );

  return {
    validatePin,
    switchUser,
    isChecking: store.status === 'CHECKING_SESSION',
    error: store.error,
    isPinAuthenticated: store.isPinAuthenticated,
  };
}

export { PIN_SESSION_STORAGE_KEY };
