import { create } from 'zustand';

export type SubscriptionTier = 'trial' | 'essential' | 'professional' | 'enterprise' | 'suspended';

export interface TenantConfig {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  licenseKey: string;
  subscriptionTier: SubscriptionTier;
  maxDevices: number;
  maxUsers: number;
  maxPatients: number;
  maxProceduresPerMonth: number;
  timezone: string;
  currency: string;
  currencySubunit: number;
  primaryColor: string;
  logoUrl: string | null;
  isActive: boolean;
  settings: Record<string, any>;
  [key: string]: any;
}

interface TenantState {
  tenantId: string | null;
  tenantName: string | null;
  primaryColor: string;
  subscriptionTier: SubscriptionTier | null;
  config: TenantConfig | null;
  setTenantId: (id: string | null) => void;
  setTenantName: (name: string | null) => void;
  setPrimaryColor: (color: string) => void;
  setSubscriptionTier: (tier: SubscriptionTier | null) => void;
  setConfig: (config: TenantConfig | null) => void;
}

export const useTenantStore = create<TenantState>()((set) => ({
  tenantId: null,
  tenantName: null,
  primaryColor: '#1B2A4A',
  subscriptionTier: null,
  config: null,
  setTenantId: (id) => set({ tenantId: id }),
  setTenantName: (name) => set({ tenantName: name }),
  setPrimaryColor: (color) => set({ primaryColor: color }),
  setSubscriptionTier: (tier) => set({ subscriptionTier: tier }),
  setConfig: (config) => set({ config }),
}));
