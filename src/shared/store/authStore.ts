// src/shared/store/authStore.ts
// Zustand: user + role + permissions + JWT claims

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'super_admin' | 'clinic_admin' | 'doctor' | 'receptionist';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  tenantId: string;
  clinicName: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pinVerified: boolean; // For kiosk fast-switch

  // Actions
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setPinVerified: (verified: boolean) => void;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  isSuperAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      pinVerified: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      setPinVerified: (verified) => set({ pinVerified: verified }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          pinVerified: false,
          isLoading: false,
        }),

      hasRole: (roles) => {
        const { user } = get();
        if (!user) return false;
        return roles.includes(user.role);
      },

      isSuperAdmin: () => {
        const { user } = get();
        return user?.role === 'super_admin';
      },
    }),
    {
      name: 'core-auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
