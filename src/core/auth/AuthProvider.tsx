import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { supabase } from '@/infrastructure/supabase/client';
import type { AuthUser } from '@/shared/store/authStore';

export { useAuth } from './useAuth';

export function useAuthContext() {
  const store = useAuthStore();
  return {
    user: store.user,
    supabaseUser: store.supabaseUser,
    session: store.session,
    status: store.status,
    isAuthenticated: store.isAuthenticated,
    isPinAuthenticated: store.isPinAuthenticated,
    error: store.error,
    isChecking: store.status === 'CHECKING_SESSION',
    fullName: store.user?.full_name ?? '',
    role: store.user?.role ?? null,
    tenant_id: store.user?.tenant_id ?? '',
    login: store.login,
    logout: store.logout,
    clearError: store.clearError,
    validateLicense: async (_unusedKey?: string) => ({ success: true }),
    loginWithPin: async (_unusedPin: string, _unusedRole?: string) => {
      return { success: false, error: 'Use useAuth().loginWithPin() instead' };
    },
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const store = useAuthStore();
  const initialized = useRef(false);

  // P35 FIX: Prevent stale persisted auth state from bypassing the auth check.
  // Boot keeps tenant context but forces protected routes to wait for validation.
  if (!initialized.current) {
    store.boot();
  }

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const restorePinSession = async () => {
      const current = useAuthStore.getState();
      const token = sessionStorage.getItem('core-system-pin-session');
      const tenantId = current.tenant_id;

      if (!token || !tenantId) return false;

      try {
        const rpc = supabase.rpc.bind(supabase) as unknown as (
          fn: string,
          args: { p_tenant_id: string; p_session_token: string },
        ) => Promise<{ data: unknown; error: { message: string } | null }>;

        const { data, error } = await rpc('restore_pin_session', {
          p_tenant_id: tenantId,
          p_session_token: token,
        });

        if (error) return false;

        const result = data as unknown as Record<string, unknown> | null;
        if (!result?.success || !result.user_id) {
          sessionStorage.removeItem('core-system-pin-session');
          return false;
        }

        const authUser: AuthUser = {
          id: String(result.user_id),
          email: (result.email as string | null) ?? null,
          full_name: (result.full_name as string) ?? '',
          full_name_ar: (result.full_name_ar as string | null) ?? null,
          role: (result.role as AuthUser['role']) || 'receptionist',
          tenant_id: (result.tenant_id as string) ?? tenantId,
          employee_code: (result.employee_code as string | null) ?? null,
          pin_code: null,
          phone: (result.phone as string | null) ?? null,
          specialization: (result.specialization as string | null) ?? null,
        };

        const latest = useAuthStore.getState();
        latest.login(authUser, null, null);
        latest.setPinAuthenticated(true);
        return true;
      } catch {
        return false;
      }
    };

    const initializeAuth = async () => {
      // Zustand persist may hydrate after the first React render. Complete hydration
      // before reading tenant_id or the persisted PIN-auth context.
      try {
        await useAuthStore.persist.rehydrate();
      } catch {
        // Continue with the live store state; the authoritative PIN token is still
        // validated server-side below.
      }

      useAuthStore.getState().startChecking();

      if (await restorePinSession()) return;

      const current = useAuthStore.getState();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        // PIN authentication is independent of Supabase Auth.
        // A tenant may remain selected for the next login, but stale user state
        // must not remain marked as authenticated without a validated session.
        current.unauthenticate(error?.message ?? null);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        current.unauthenticate();
        return;
      }

      current.setSession(session);
      current.setSupabaseUser(user);

      const { data: profile, error: profileError } = await supabase
        .from('clinic_users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        current.unauthenticate(profileError?.message || 'Profile not found');
        return;
      }

      const authUser: AuthUser = {
        id: profile.id,
        email: user.email ?? null,
        full_name: profile.full_name ?? '',
        full_name_ar: profile.full_name_ar ?? null,
        role: (profile.role as AuthUser['role']) || 'receptionist',
        tenant_id: profile.tenant_id ?? '',
        employee_code: profile.employee_code ?? null,
        pin_code: profile.pin_code ?? null,
        phone: profile.phone ?? null,
        specialization: profile.specialization ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
      };

      useAuthStore.getState().authenticate(authUser, user, session);
    };

    void initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const current = useAuthStore.getState();

      if (!session) {
        // Always read the current store, not the render-time snapshot. This prevents
        // a delayed Supabase INITIAL_SESSION event from invalidating a valid PIN session.
        if (current.tenant_id && sessionStorage.getItem('core-system-pin-session')) {
          return;
        }

        if (current.tenant_id) {
          current.setStatus('UNAUTHENTICATED');
          return;
        }

        current.unauthenticate();
        return;
      }

      current.setSession(session);
      current.setSupabaseUser(session.user);

      if (!current.user) {
        supabase
          .from('clinic_users')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile }) => {
            if (!profile) return;

            const latest = useAuthStore.getState();
            const authUser: AuthUser = {
              id: profile.id,
              email: session.user.email ?? null,
              full_name: profile.full_name ?? '',
              full_name_ar: profile.full_name_ar ?? null,
              role: (profile.role as AuthUser['role']) || 'receptionist',
              tenant_id: profile.tenant_id ?? '',
              employee_code: profile.employee_code ?? null,
              pin_code: profile.pin_code ?? null,
              phone: profile.phone ?? null,
              specialization: profile.specialization ?? null,
              avatar_url: session.user.user_metadata?.avatar_url ?? null,
            };
            latest.authenticate(authUser, session.user, session);
          });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
