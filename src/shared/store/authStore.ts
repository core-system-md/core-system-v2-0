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

export interface TenantData {
  clinicName: string | null;
  subscriptionTier: string;
  primaryColor: string;
  logoUrl: string | null;
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
  tenantData: TenantData | null;

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
  setTenant: (tenantId: string, tenantData?: TenantData | null) => void;
}

// ─── Selectors (for useAuth hook) ─────────────────────────
export const selectIsPinLocked = (state: AuthState) =>
  state.pinLockedUntil !== null && Date.now() < state.pinLockedUntil;

export const selectPinAttemptsRemaining = (state: AuthState) =>
  Math.max(0, 5 - state.pinAttempts);

export const selectUserRole = (state: AuthState) => state.user?.role ?? null;

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
      tenantData: null,

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
          tenantData: null,
        }),

      requirePin: () => set({ status: 'PIN_REQUIRED', isAuthenticated: false }),

      lock: () => set({ status: 'LOCKED', isAuthenticated: false }),

      // ─── Legacy setters ─────────────────────────────────
      setUser: (user) => set({ user }),
      setSupabaseUser: (supabaseUser) => set({ supabaseUser }),
      setSession: (session) => set({ session }),
      setStatus: (status) => set({ status }),
      setError: (error) => set({ error }),
      setPinAuthenticated: (val) => set({ isPinAuthenticated: val }),

      incrementPinAttempt: () => {
        const current = get().pinAttempts;
        const next = current + 1;
        if (next >= 5) {
          set({
            pinAttempts: next,
            pinLockedUntil: Date.now() + 15 * 60 * 1000,
            status: 'LOCKED',
          });
        } else {
          set({ pinAttempts: next });
        }
      },

      resetPinAttempts: () => set({ pinAttempts: 0, pinLockedUntil: null }),

      login: (authUser, supabaseUser, session) => {
        get().authenticate(authUser, supabaseUser, session);
      },

      logout: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('[authStore] signOut error:', error);
        get().unauthenticate();
      },

      clearError: () => set({ error: null }),

      setTenant: (tenantId: string, tenantData?: TenantData | null) =>
        set({
          tenant_id: tenantId,
          tenantData: tenantData ?? null,
        }),
    }),
    {
      name: 'auth-store',
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
        tenantData: state.tenantData,
      }),
    }
  )
);