import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'doctor' | 'receptionist' | 'clinic_admin' | 'super_admin';

export interface TenantInfo {
  id: string;
  name: string;
  nameAr: string | null;
  primaryColor: string | null;
  tier: string;
  licenseKey: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  fullNameAr: string | null;
  role: UserRole;
  tenantId: string;
  phone: string | null;
  specialization: string | null;
}

interface AuthState {
  user: AuthUser | null;
  tenant: TenantInfo | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  setTenant: (tenant: TenantInfo | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setTenant: (tenant) => set({ tenant }),
      logout: () => set({ user: null, tenant: null, isAuthenticated: false }),
    }),
    {
      name: 'core-system-auth',
      partialize: (state) => ({ user: state.user, tenant: state.tenant }),
    }
  )
);
