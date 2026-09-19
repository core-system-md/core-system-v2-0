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

  // P35 FIX: Prevent stale persisted state from bypassing auth check.
  // Zustand persist restores isAuthenticated=true before useEffect runs.
  // RootRedirect reads this state and redirects before AuthProvider verifies.
  if (!initialized.current) {
    store.boot();
  }

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // ─── STATE MACHINE: BOOTING → CHECKING_SESSION ────────
    store.startChecking();

    const restorePinSession = async () => {
      const token = sessionStorage.getItem('core-system-pin-session');
      const tenantId = store.tenant_id;

      if (!token || !tenantId) return false;

      try {
        const { data, error } = await supabase.rpc('restore_pin_session', {
          p_tenant_id: tenantId,
          p_session_token: token,
        });

        if (error) return false;

        const result = data as Record<string, unknown> | null;
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

        store.login(authUser, null, null);
        store.setPinAuthenticated(true);
        return true;
      } catch {
        return false;
      }
    };

    // ─── Check existing authentication ───────────────────
    const initializeAuth = async () => {
      if (await restorePinSession()) return;

      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        // If tenant context exists (license validated), don't wipe tenant data
        // Just mark auth as unauthenticated so PIN flow can proceed.
        if (store.tenant_id) {
          store.setStatus('UNAUTHENTICATED');
          return;
        }

        // No tenant context — full unauthenticate.
        store.unauthenticate(error?.message ?? null);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // If tenant context exists, keep it for PIN flow.
        if (store.tenant_id) {
          store.setStatus('UNAUTHENTICATED');
          return;
        }

        store.unauthenticate();
        return;
      }

      store.setSession(session);
      store.setSupabaseUser(user);

      const { data: profile, error: profileError } = await supabase
        .from('clinic_users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        store.unauthenticate(profileError?.message || 'Profile not found');
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

      store.authenticate(authUser, user, session);
    };

    void initializeAuth();

    // ─── Listen for auth state changes ────────────────────
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        // PIN authentication is independent of Supabase Auth. A valid PIN
        // session token must survive route reloads without being logged out.
        if (store.tenant_id && sessionStorage.getItem('core-system-pin-session')) {
          return;
        }

        // If tenant context exists, keep it for re-auth.
        if (store.tenant_id) {
          store.setStatus('UNAUTHENTICATED');
          return;
        }

        store.unauthenticate();
        return;
      }

      store.setSession(session);
      store.setSupabaseUser(session.user);

      if (!store.user) {
        supabase
          .from('clinic_users')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
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
              store.authenticate(authUser, session.user, session);
            }
          });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [store]);

  return <>{children}</>;
}