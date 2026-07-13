// CORE SYSTEM v2.1 — useAuth.ts
// ...

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { supabase } from '@/infrastructure/supabase/client';
import type { AuthUser } from '@/shared/store/authStore';

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
      return { success: false, error: 'Use usePinAuth() instead' };
    },
  };
}

export function useAuth() {
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

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          // If tenant context exists, keep it for PIN flow
          if (store.tenant_id) {
            store.setStatus('UNAUTHENTICATED');
            return;
          }

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
        // If tenant context exists, keep it for re-auth
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

  return {
    // ─── Auth actions ─────────────────────────────────────
    validateLicense: async (_unusedKey?: string) => ({ success: true }),
    loginWithPin: async (pin: string, selectedRole?: string) => {
      const isDevMode = import.meta.env.DEV;

      // ─── DEV MODE MOCK (isolated) ───
      if (isDevMode) {
        const mockUser: AuthUser = {
          id: 'dev-user',
          email: null,
          full_name: 'Dev Doctor',
          full_name_ar: null,
          role: (selectedRole as AuthUser['role']) || 'doctor',
          tenant_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          employee_code: 'DEV-EMP',
          pin_code: null,
          phone: null,
          specialization: null,
        };

        store.login(mockUser, null, null);
        store.setPinAuthenticated(true);
        return { success: true, user: mockUser };
      }
      // ─── END DEV MODE ───

      const tenantId = store.tenant_id || store.user?.tenant_id || '';
      if (!tenantId) {
        return { success: false, error: 'Missing tenant ID — validate license first' };
      }

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
          const msg = 'Invalid PIN or user not found';
          store.setError(msg);
          store.unauthenticate();
          store.incrementPinAttempt();
          return { success: false, error: msg };
        }

        store.resetPinAttempts();

        const profile = pinUser as any;

        const { data: sessionData } = await supabase.auth.getSession();
        const sbSession = sessionData?.session;

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

        store.login(authUser, sbSession?.user ?? null, sbSession ?? null);
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
    loginWithEmail: async (email: string, password: string) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          store.setError(error.message);
          alert(error.message);
          return { success: false, error: error.message };
        }
        if (data.user) {
          const authUser: AuthUser = {
            id: data.user.id,
            email: data.user.email ?? null,
            full_name: data.user.user_metadata?.full_name || '',
            full_name_ar: data.user.user_metadata?.full_name_ar || null,
            role: data.user.user_metadata?.role || 'receptionist',
            tenant_id: data.user.user_metadata?.tenant_id || '',
            employee_code: data.user.user_metadata?.employee_code || null,
            pin_code: null,
            phone: data.user.user_metadata?.phone || null,
            specialization: data.user.user_metadata?.specialization || null,
          };
          store.login(authUser, data.user, data.session);
          return { success: true };
        }
        return { success: false, error: 'No user returned' };
      } catch (err: any) {
        store.setError(err?.message || 'Email login failed');
        alert(err?.message || 'Email login failed');
        return { success: false, error: err?.message || 'Email login failed' };
      }
    },
    logout: async () => {
      await store.logout();
    },
    clearError: () => {
      store.clearError();
    },
    signOut: async () => {
      await logout();
    },

    // ─── State ────────────────────────────────────────────
    isChecking: store.status === 'CHECKING_SESSION',
    isAuthenticated: store.isAuthenticated,
    isPinAuthenticated: store.isPinAuthenticated,
    user: store.user,
    status: store.status,
    error: store.error,

    // ─── Derived (for backward compatibility) ─────────────
    fullName: store.user?.full_name ?? '',
    role: store.user?.role ?? null,
    tenant_id: store.user?.tenant_id ?? '',
  };
}

export { useAuthContext };
