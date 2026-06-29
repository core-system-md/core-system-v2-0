// ============================================================
// CORE SYSTEM v2.1 — Auth Store (Zustand)
// SINGLE SOURCE OF TRUTH for Authentication State
// Constitution §1: No Redux, no Context overuse. Zustand only.
// Constitution §9.6: PIN Auth — 4-digit PIN, rate limiting.
// ============================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthUser, AuthStatus, LicenseValidationResult } from '@/shared/types/auth';

interface AuthState {
  // ── Core State ──
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  status: AuthStatus;

  // ── Tenant State (Single Source) ──
  tenant_id: string | null;
  license: LicenseValidationResult | null;

  // ── PIN State ──
  pinAttempts: number;
  pinLockedUntil: number | null;

  // ── Actions ──
  setUser: (user: AuthUser | null) => void;
  setAuthenticated: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  setStatus: (status: AuthStatus) => void;
  setTenant: (tenant_id: string | null, license: LicenseValidationResult | null) => void;
  incrementPinAttempt: () => void;
  resetPinAttempts: () => void;
  lockPin: (until: number) => void;
  clearError: () => void;
  logout: () => void;
}

const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCK_DURATION_MS = 15 * 60 * 1000;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      status: 'idle',
      tenant_id: null,
      license: null,
      pinAttempts: 0,
      pinLockedUntil: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      setLoading: (value) => set({ isLoading: value }),
      setError: (error) => set({ error }),
      setStatus: (status) => set({ status }),
      
      setTenant: (tenant_id, license) => set({ 
        tenant_id, 
        license,
        status: tenant_id ? 'license_valid' : 'idle'
      }),

      incrementPinAttempt: () => {
        const attempts = get().pinAttempts + 1;
        if (attempts >= PIN_MAX_ATTEMPTS) {
          set({ 
            pinAttempts: attempts, 
            pinLockedUntil: Date.now() + PIN_LOCK_DURATION_MS,
            error: 'تم تجاوز الحد الأقصى للمحاولات. يرجى الانتظار 15 دقيقة.'
          });
        } else {
          set({ pinAttempts: attempts });
        }
      },

      resetPinAttempts: () => set({ pinAttempts: 0, pinLockedUntil: null }),
      
      lockPin: (until) => set({ pinLockedUntil: until }),
      
      clearError: () => set({ error: null }),

      logout: () => set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        status: 'idle',
        tenant_id: null,
        license: null,
        pinAttempts: 0,
        pinLockedUntil: null,
      }),
    }),
    {
      name: 'core_auth_store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tenant_id: state.tenant_id,
        license: state.license,
      }),
    }
  )
);

// ── Selectors ──
export const selectUser = (state: AuthState) => state.user;
export const selectTenantId = (state: AuthState) => state.tenant_id;
export const selectUserRole = (state: AuthState) => state.user?.role ?? null;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectIsPinLocked = (state: AuthState) => {
  if (!state.pinLockedUntil) return false;
  return Date.now() < state.pinLockedUntil;
};
export const selectPinAttemptsRemaining = (state: AuthState) => 
  Math.max(0, PIN_MAX_ATTEMPTS - state.pinAttempts);
