import { useCallback } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { supabase } from '@/infrastructure/supabase/client';
import type { AuthUser } from '@/shared/store/authStore';

export function PinAuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function usePinAuth() {
  const store = useAuthStore();

  const validatePin = useCallback(
    async (_employeeCode: string, pin: string, tenantId: string) => {
      store.startChecking();
      store.setError(null);

      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('validate_pin', {
          p_tenant_id: tenantId,
          p_pin: pin,
        });

        if (rpcError) {
          store.setError(rpcError.message);
          store.unauthenticate();
          store.incrementPinAttempt();
          return { success: false, error: rpcError.message };
        }

        const pinUserRows = Array.isArray(rpcData) ? rpcData : [rpcData];
        const pinUser = pinUserRows.length > 0 ? pinUserRows[0] : null;

        if (!pinUser) {
          const msg = 'Invalid PIN or employee code';
          store.setError(msg);
          store.unauthenticate();
          store.incrementPinAttempt();
          return { success: false, error: msg };
        }

        store.resetPinAttempts();

        const profile = pinUser as any;

        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;

        const authUser: AuthUser = {
          id: profile.id,
          email: profile.email ?? null,
          full_name: profile.full_name ?? '',
          full_name_ar: profile.full_name_ar ?? null,
          role: (profile.role as AuthUser['role']) || 'receptionist',
          tenant_id: profile.tenant_id ?? '',
          employee_code: profile.employee_code ?? null,
          pin_code: profile.pin_code ?? null,
          phone: profile.phone ?? null,
          specialization: profile.specialization ?? null,
        };

        store.login(authUser, session?.user ?? null, session ?? null);
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
    async (_employeeCode: string, pin: string, tenantId: string) => {
      store.setUser(null);
      store.setSupabaseUser(null);
      store.setSession(null);
      store.setPinAuthenticated(false);
      store.boot();
      store.resetPinAttempts();
      return validatePin(_employeeCode, pin, tenantId);
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