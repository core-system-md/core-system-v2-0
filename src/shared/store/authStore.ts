// src/shared/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type RoleId = 'super_admin' | 'clinic_admin' | 'doctor' | 'receptionist';

export interface User {
  id: string;
  fullName: string;
  fullNameAr?: string | null;
  email?: string | null;
  role: RoleId;
  tenantId: string;
  phone?: string | null;
  specialization?: string | null;
}

export interface Tenant {
  id: string;
  name: string;
  nameAr?: string | null;
  primaryColor?: string | null;
  tier: string;
  licenseKey: string;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  isPinAuthenticated: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setTenant: (tenant: Tenant | null) => void;
  setPinAuthenticated: (val: boolean) => void;
  clearAuth: () => void;
  
  // Selectors (Required by router.tsx error log)
  selectIsAuthenticated: () => boolean;
  selectUserRole: () => RoleId | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tenant: null,
      isPinAuthenticated: false,

      setUser: (user) => set({ user, isPinAuthenticated: !!user }),
      setTenant: (tenant) => set({ tenant }),
      setPinAuthenticated: (isPinAuthenticated) => set({ isPinAuthenticated }),
      
      clearAuth: () => set({ user: null, tenant: null, isPinAuthenticated: false }),

      selectIsAuthenticated: () => !!get().user || get().isPinAuthenticated,
      selectUserRole: () => get().user?.role ?? null,
    }),
    {
      name: 'core_auth_store', // Replaces all legacy localStorage keys
    }
  )
);
