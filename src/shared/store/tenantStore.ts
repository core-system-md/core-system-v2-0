// ============================================================
// CORE SYSTEM v2.1 — Tenant Store (Zustand)
// Constitution §5: ALWAYS use database.types.ts
// ============================================================

import { create } from 'zustand';
import { supabase } from '@/infrastructure/supabase/client';

interface TenantState {
  tenantId: string | null;
  clinicName: string | null;
  subscriptionTier: string;
  primaryColor: string;
  logoUrl: string | null;
  isLoading: boolean;
  error: string | null;

  fetchTenant: () => Promise<void>;
  setTenantId: (id: string) => void;
  clearTenant: () => void;
}

export const useTenantStore = create<TenantState>((set, get) => ({
  tenantId: null,
  clinicName: null,
  subscriptionTier: 'trial',
  primaryColor: '#1B2A4A',
  logoUrl: null,
  isLoading: false,
  error: null,

  fetchTenant: async () => {
    const { tenantId } = get();
    if (!tenantId) return;

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('master_tenants')
        .select('id, name, subscription_tier')
        .eq('id', tenantId)
        .is('deleted_at', null)
        .single();

      if (error) throw error;

      set({
        clinicName: data?.name || null,
        subscriptionTier: data?.subscription_tier || 'trial',
        primaryColor: '#1B2A4A',
        logoUrl: null,
        isLoading: false,
        error: null
      });

    } catch (err: unknown) {
      console.error('[tenantStore] Fetch error:', err);
      set({ 
        error: err instanceof Error ? err.message : 'Failed to fetch tenant', 
        isLoading: false,
        subscriptionTier: 'trial'
      });
    }
  },

  setTenantId: (id: string) => {
    set({ tenantId: id });
    get().fetchTenant();
  },

  clearTenant: () => {
    set({
      tenantId: null,
      clinicName: null,
      subscriptionTier: 'trial',
      primaryColor: '#1B2A4A',
      logoUrl: null,
      error: null
    });
  }
}));
