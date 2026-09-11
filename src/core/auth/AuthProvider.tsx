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
    loginWithPin: async (_unusedPin: string, _unusedRole?: string) => ({ success: false, error: 'Use useAuth().loginWithPin() instead' }),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const store = useAuthStore();
  const initialized = useRef(false);

  if (!initialized.current) {
    store.boot();
  }

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const getLiveAuthState = () => useAuthStore.getState();
    const persistApi = useAuthStore.persist;
    let hydrationReady = persistApi.hasHydrated();

    const hasPinSession = () => {
      const state = getLiveAuthState();
      return (
        !!state.user &&
        !!state.user.tenant_id &&
        typeof window !== 'undefined' &&
        !!window.sessionStorage.getItem('core-system-pin-session')
      );
    };

    const preserveHydratedPinSession = () => {
      const state = getLiveAuthState();
      if (!hasPinSession()) return false;
      state.setStatus('AUTHENTICATED');
      return true;
    };

    const initializeAuth = () => {
      hydrationReady = true;
      const liveState = getLiveAuthState();

      // PIN authentication is intentionally independent from Supabase Auth.
      // Once Zustand has hydrated and the scoped PIN session token exists,
      // preserve the authenticated staff identity across hard navigation.
      if (preserveHydratedPinSession()) return;

      liveState.startChecking();

      supabase.auth.getUser().then(({ data: { user }, error }) => {
        if (error || !user) {
          const state = getLiveAuthState();
          if (preserveHydratedPinSession()) return;
          if (state.tenant_id) {
            state.setStatus('UNAUTHENTICATED');
            return;
          }
          state.unauthenticate(error?.message ?? null);
          return;
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
          const state = getLiveAuthState();
          if (!session) {
            if (preserveHydratedPinSession()) return;
            if (state.tenant_id) {
              state.setStatus('UNAUTHENTICATED');
              return;
            }
            state.unauthenticate();
            return;
          }

          state.setSession(session);
          state.setSupabaseUser(user);

          supabase
            .from('clinic_users')
            .select('*')
            .eq('id', user.id)
            .single()
            .then(({ data: profile, error: profileError }) => {
              if (profileError || !profile) {
                if (preserveHydratedPinSession()) return;
                useAuthStore.getState().unauthenticate(profileError?.message || 'Profile not found');
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
            });
        });
      });
    };

    let unsubscribeHydration: (() => void) | undefined;
    if (persistApi.hasHydrated()) {
      initializeAuth();
    } else {
      unsubscribeHydration = persistApi.onFinishHydration(() => initializeAuth());
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!hydrationReady) return;

      const state = getLiveAuthState();
      if (!session) {
        if (preserveHydratedPinSession()) return;
        if (state.tenant_id) {
          state.setStatus('UNAUTHENTICATED');
          return;
        }
        state.unauthenticate();
        return;
      }

      state.setSession(session);
      state.setSupabaseUser(session.user);

      if (!state.user) {
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
                pin_code: null,
                phone: profile.phone ?? null,
                specialization: profile.specialization ?? null,
                avatar_url: session.user.user_metadata?.avatar_url ?? null,
              };
              useAuthStore.getState().authenticate(authUser, session.user, session);
            }
          });
      }
    });

    return () => {
      unsubscribeHydration?.();
      subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
