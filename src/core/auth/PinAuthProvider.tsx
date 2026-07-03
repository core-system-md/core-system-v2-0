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
    async (employeeCode: string, pin: string, tenantId: string) => {
      store.setStatus('loading');
      store.setError(null);

      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('validate_pin', {
          p_employee_code: employeeCode,
          p_pin: pin,
          p_tenant_id: tenantId,
        });

        if (rpcError) {
          store.setError(rpcError.message);
          store.setStatus('unauthenticated');
          store.incrementPinAttempt();
          return { success: false, error: rpcError.message };
        }

        const result = rpcData as Record<string, any> | null;
        if (!result || !result.success) {
          const msg = result?.message || 'Invalid PIN or employee code';
          store.setError(msg);
          store.setStatus('unauthenticated');
          store.incrementPinAttempt();
          return { success: false, error: msg };
        }

        store.resetPinAttempts();

        const { data: profile, error: profileError } = await supabase
          .from('clinic_users')
          .select('*')
          .eq('id', result.user_id)
          .single();

        if (profileError || !profile) {
          store.setError(profileError?.message || 'Profile not found');
          store.setStatus('unauthenticated');
          return { success: false, error: profileError?.message || 'Profile not found' };
        }

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
        store.setStatus('unauthenticated');
        store.incrementPinAttempt();
        return { success: false, error: msg };
      }
    },
    [store]
  );

  const switchUser = useCallback(
    async (employeeCode: string, pin: string, tenantId: string) => {
      store.setUser(null);
      store.setSupabaseUser(null);
      store.setSession(null);
      store.setPinAuthenticated(false);
      store.setStatus('idle');
      store.resetPinAttempts();
      return validatePin(employeeCode, pin, tenantId);
    },
    [store, validatePin]
  );

  return {
    validatePin,
    switchUser,
    isLoading: store.status === 'loading',
    error: store.error,
    isPinAuthenticated: store.isPinAuthenticated,
  };
}
