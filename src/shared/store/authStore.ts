import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/infrastructure/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

// ────────────────────────────────────────────────────────────
// STATE MACHINE: Auth Status
// BOOTING → CHECKING_SESSION → AUTHENTICATED | UNAUTHENTICATED | PIN_REQUIRED | LOCKED
// ────────────────────────────────────────────────────────────
export type AuthStatus =
  | 'BOOTING'
  | 'CHECKING_SESSION'
  | 'AUTHENTICATED'
  | 'UNAUTHENTICATED'
  | 'PIN_REQUIRED'
  | 'LOCKED';

export interface AuthUser {
  id: string;
  email?: string | null;
  full_name: string;
  full_name_ar?: string | null;
  role: 'super_admin' | 'clinic_admin' | 'doctor' | 'receptionist';
  tenant_id: string;
  employee_code?: string | null;
  pin_code?: string | null;
  phone?: string | null;
  specialization?: string | null;
  avatar_url?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  supabaseUser: User | null;
  session: Session | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  error: string | null;
  isPinAuthenticated: boolean;
  pinAttempts: number;
  pinLockedUntil: number | null;
  tenant_id: string;

  // ─── State Machine Actions ──────────────────────────────
  boot: () => void;
  startChecking: () => void;
  authenticate: (authUser: AuthUser, supabaseUser: User | null, session: Session | null) => void;
  unauthenticate: (error?: string | null) => void;
  requirePin: () => void;
  lock: () => void;

  // ─── Legacy setters (for gradual migration) ─────────────
  setUser: (user: AuthUser | null) => void;
  setSupabaseUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setStatus: (status: AuthStatus) => void;
  setError: (error: string | null) => void;
  setPinAuthenticated: (val: boolean) => void;
  incrementPinAttempt: () => void;
  resetPinAttempts: () => void;
  login: (authUser: AuthUser, supabaseUser: User | null, session: Session | null) => void;
  logout: () => Promise<void>;
  clearError: () => void;
  setTenant: (tenantId: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ─── Initial State ──────────────────────────────────
      user: null,
      supabaseUser: null,
      session: null,
      status: 'BOOTING',
      isAuthenticated: false,
      error: null,
      isPinAuthenticated: false,
      pinAttempts: 0,
      pinLockedUntil: null,
      tenant_id: '',

      // ─── State Machine Actions ──────────────────────────
      boot: () => set({ status: 'BOOTING', isAuthenticated: false }),

      startChecking: () => set({ status: 'CHECKING_SESSION', isAuthenticated: false }),

      authenticate: (authUser, supabaseUser, session) =>
        set({
          user: authUser,
          supabaseUser,
          session,
          status: 'AUTHENTICATED',
          isAuthenticated: true,
          error: null,
          isPinAuthenticated: true,
          pinAttempts: 0,
          pinLockedUntil: null,
          tenant_id: authUser.tenant_id,
        }),

      unauthenticate: (error = null) =>
        set({
          user: null,
          supabaseUser: null,
          session: null,
          status: 'UNAUTHENTICATED',
          isAuthenticated: false,
          error,
          isPinAuthenticated: false,
          pinAttempts: 0,
          pinLockedUntil: null,
          tenant_id: '',
        }),

      requirePin: () =>
        set({
          status: 'PIN_REQUIRED',
          isAuthenticated: false,
          isPinAuthenticated: false,
        }),

      lock: () =>
        set({
          status: 'LOCKED',
          isAuthenticated: false,
          isPinAuthenticated: false,
        }),

      // ─── Legacy setters (for backward compat) ───────────
      setUser: (user) => set({ user, tenant_id: user?.tenant_id ?? '' }),
      setSupabaseUser: (supabaseUser) => set({ supabaseUser }),
      setSession: (session) => set({ session }),
      setStatus: (status) => set({ status }),
      setError: (error) => set({ error }),
      setPinAuthenticated: (isPinAuthenticated) => set({ isPinAuthenticated }),
      incrementPinAttempt: () => {
        const attempts = get().pinAttempts + 1;
        const locked = attempts >= 5 ? Date.now() + 15 * 60 * 1000 : null;
        set({ pinAttempts: attempts, pinLockedUntil: locked });
      },
      resetPinAttempts: () => set({ pinAttempts: 0, pinLockedUntil: null }),

      // login() delegates to authenticate() for state machine compliance
      login: (authUser, supabaseUser, session) => {
        get().authenticate(authUser, supabaseUser, session);
      },

      logout: async () => {
        await supabase.auth.signOut();
        get().unauthenticate();
      },

      clearError: () => set({ error: null }),
      setTenant: (tenantId: string) => set({ tenant_id: tenantId }),
    }),
    {
      name: 'core-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        supabaseUser: state.supabaseUser,
        session: state.session,
        status: state.status,
        isAuthenticated: state.isAuthenticated,
        isPinAuthenticated: state.isPinAuthenticated,
        pinAttempts: state.pinAttempts,
        pinLockedUntil: state.pinLockedUntil,
        tenant_id: state.tenant_id,
      }),
    }
  )
);

// ─── Selectors ────────────────────────────────────────────
export const selectUserRole = (state: AuthState) => state.user?.role ?? null;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectIsPinLocked = (state: AuthState) => {
  if (!state.pinLockedUntil) return false;
  return Date.now() < state.pinLockedUntil;
};
export const selectPinAttemptsRemaining = (state: AuthState) => Math.max(0, 5 - state.pinAttempts);