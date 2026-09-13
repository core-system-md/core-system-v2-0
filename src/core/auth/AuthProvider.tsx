import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { supabase } from '@/infrastructure/supabase/client';
import type { AuthUser } from '@/shared/store/authStore';

const PIN_SESSION_STORAGE_KEY = 'core-system-pin-session';

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

    const hasPinSession = () =>
      window.sessionStorage.getItem(PIN_SESSION_STORAGE_KEY) !== null &&
      store.isPinAuthenticated &&
      !!store.user;

    const restorePinSession = async (): Promise<boolean> => {
      const token = window.sessionStorage.getItem(PIN_SESSION_STORAGE_KEY);
      const persistedUser = store.user;

      if (!token || !persistedUser || !store.isPinAuthenticated) return false;

      const rpc = supabase.rpc as unknown as (
        fn: string,
        args: { p_tenant_id: string; p_session_token: string },
      ) => Promise<{ data: unknown; error: { message: string } | null }>;

      const { error } = await rpc('get_queue_for_pin_session', {
        p_tenant_id: persistedUser.tenant_id,
        p_session_token: token,
      });

      if (error) {
        store.unauthenticate(error.message);
        return true;
      }

      // PIN auth is intentionally independent from Supabase Auth JWTs.
      // The existing server-verified PIN session token remains the source of truth.
      store.authenticate(persistedUser, null, null);
      return true;
    };

    // ─── Check existing session ───────────────────────────
    // A verified PIN session takes precedence over any unrelated/stale Supabase Auth session.
    // This prevents a legacy JWT profile from replacing the role established by create_pin_session.
    if (hasPinSession()) {
      void restorePinSession();
    } else {
      supabase.auth.getUser().then(async ({ data: { user }, error }) => {
        if (error || !user) {
          if (await restorePinSession()) return;

          // If tenant context exists (license validated), don't wipe tenant data
          // Just mark auth as unauthenticated so PIN flow can proceed
          if (store.tenant_id) {
            store.setStatus('UNAUTHENTICATED');
            return;
          }

          // No tenant context — full unauthenticate
          store.unauthenticate(error?.message ?? null);
          return;
        }

        // Do not allow a legacy Supabase Auth session to take precedence over a PIN session
        // that may have been established while this provider was already mounted.
        if (window.sessionStorage.getItem(PIN_SESSION_STORAGE_KEY) && store.isPinAuthenticated) {
          return;
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) {
            if (window.sessionStorage.getItem(PIN_SESSION_STORAGE_KEY) && store.isPinAuthenticated) {
              return;
            }

            // If tenant context exists, keep it for PIN flow
            if (store.tenant_id) {
              store.setStatus('UNAUTHENTICATED');
              return;
            }

            store.unauthenticate();
            return;
          }

          if (window.sessionStorage.getItem(PIN_SESSION_STORAGE_KEY) && store.isPinAuthenticated) {
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
              if (window.sessionStorage.getItem(PIN_SESSION_STORAGE_KEY) && store.isPinAuthenticated) {
                return;
              }

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
    }

    // ─── Listen for auth state changes ────────────────────
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // PIN authentication is intentionally independent from Supabase Auth.
      // Once a verified PIN session exists, Supabase Auth events must not replace
      // the role/user established by create_pin_session.
      if (window.sessionStorage.getItem(PIN_SESSION_STORAGE_KEY) && store.isPinAuthenticated) {
        return;
      }

      if (!session) {
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
            if (window.sessionStorage.getItem(PIN_SESSION_STORAGE_KEY) && store.isPinAuthenticated) {
              return;
            }

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
