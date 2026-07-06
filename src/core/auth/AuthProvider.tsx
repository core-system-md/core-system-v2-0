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
    validateLicense: async (_key?: string) => ({ success: true }),
    loginWithPin: async (_pin: string, _role?: string) => {
      return { success: false, error: 'Use usePinAuth() instead' };
    },
  };
}

// ═══ DEV MODE DETECTION HELPER ═══
function isDevModeActive(): boolean {
  return (
    import.meta.env.DEV ||
    localStorage.getItem('tenant_id') === '00000000-0000-0000-0000-000000000001'
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const store = useAuthStore();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // ─── STATE MACHINE: BOOTING → CHECKING_SESSION ────────
    store.startChecking();

    // ─── Check existing session ───────────────────────────
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        // ═══ DEV MODE BYPASS #1 ═══
        if (isDevModeActive() && store.isAuthenticated && store.user) {
          // Dev Mode: keep Zustand state, skip Supabase session check
          return;
        }
        // ═══ END DEV MODE BYPASS ═══

        store.unauthenticate(error?.message ?? null);
        return;
      }

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          // ═══ DEV MODE BYPASS #2 ═══
          if (isDevModeActive() && store.isAuthenticated && store.user) {
            // Dev Mode: keep Zustand state, skip Supabase session requirement
            return;
          }
          // ═══ END DEV MODE BYPASS ═══

          store.unauthenticate();
          return;
        }

        store.setSession(session);
        store.setSupabaseUser(user);

        supabase
          .from('clinic_users')
          .select('*')
          .eq('id', user.id)
          .single()
          .then(({ data: profile, error: profileError }) => {
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
          });
      });
    });

    // ─── Listen for auth state changes ────────────────────
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        // ═══ DEV MODE BYPASS #3 ═══
        if (isDevModeActive() && store.isAuthenticated && store.user) {
          // Dev Mode: preserve Zustand state on Supabase auth state change
          return;
        }
        // ═══ END DEV MODE BYPASS ═══

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