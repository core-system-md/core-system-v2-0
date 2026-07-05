import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js';

export type AuthStatus =
  | 'BOOTING'
  | 'CHECKING_SESSION'
  | 'AUTHENTICATED'
  | 'UNAUTHENTICATED'
  | 'PIN_REQUIRED'
  | 'LOCKED';

export type UserRole = 'super_admin' | 'clinic_admin' | 'doctor' | 'receptionist';

export interface AuthUser {
  id: string;
  email: string | null;
  full_name: string;
  full_name_ar: string | null;
  role: UserRole;
  tenant_id: string;
  employee_code: string | null;
  pin_code: string | null;
  phone: string | null;
  specialization: string | null;
  avatar_url?: string | null;
}

export interface AuthState {
  user: AuthUser | null;
  supabaseUser: SupabaseUser | null;
  session: SupabaseSession | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  isPinAuthenticated: boolean;
  tenant_id: string;
  error: string | null;
  pinAttempts: number;
  isLocked: boolean;

  setUser: (user: AuthUser | null) => void;
  setSupabaseUser: (user: SupabaseUser | null) => void;
  setSession: (session: SupabaseSession | null) => void;
  setStatus: (status: AuthStatus) => void;
  setPinAuthenticated: (value: boolean) => void;
  setTenant: (tenantId: string) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  incrementPinAttempt: () => void;
  resetPinAttempts: () => void;
  login: (authUser: AuthUser, sbUser: SupabaseUser | null, sbSession: SupabaseSession | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      supabaseUser: null,
      session: null,
      status: 'BOOTING',
      isAuthenticated: false,
      isPinAuthenticated: false,
      tenant_id: '',
      error: null,
      pinAttempts: 0,
      isLocked: false,

      setUser: (user) => set({ user, tenant_id: user?.tenant_id ?? '' }),
      setSupabaseUser: (supabaseUser) => set({ supabaseUser }),
      setSession: (session) => set({ session }),
      setStatus: (status) => set({ status }),
      setPinAuthenticated: (isPinAuthenticated) => set({ isPinAuthenticated }),
      setTenant: (tenantId: string) => set({ tenant_id: tenantId }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      incrementPinAttempt: () => {
        const current = get().pinAttempts + 1;
        if (current >= 5) {
          set({ pinAttempts: current, isLocked: true, status: 'LOCKED' });
        } else {
          set({ pinAttempts: current });
        }
      },

      resetPinAttempts: () => set({ pinAttempts: 0, isLocked: false }),

      login: (authUser, sbUser, sbSession) =>
        set({
          user: authUser,
          supabaseUser: sbUser,
          session: sbSession,
          status: 'AUTHENTICATED',
          isAuthenticated: true,
          tenant_id: authUser.tenant_id,
          error: null,
          pinAttempts: 0,
        }),

      logout: () =>
        set({
          user: null,
          supabaseUser: null,
          session: null,
          status: 'UNAUTHENTICATED',
          isAuthenticated: false,
          isPinAuthenticated: false,
          tenant_id: '',
          error: null,
          pinAttempts: 0,
          isLocked: false,
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        status: state.status,
        tenant_id: state.tenant_id,
        isPinAuthenticated: state.isPinAuthenticated,
      }),
    }
  )
);