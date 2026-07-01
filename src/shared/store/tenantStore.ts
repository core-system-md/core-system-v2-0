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

  // Actions
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
        .select('id, clinic_name, subscription_tier, primary_color, logo_url')
        .eq('id', tenantId)
        .is('deleted_at', null)
        .single();

      if (error) throw error;

      const row: any = data as any;
      set({
        clinicName: row?.clinic_name || null,
        subscriptionTier: row?.subscription_tier || 'trial',
        primaryColor: row?.primary_color || '#1B2A4A',
        logoUrl: row?.logo_url || null,
        isLoading: false,
        error: null
      });

    } catch (err: unknown) {
      console.error('[tenantStore] Fetch error:', err);
      set({ 
        error: err instanceof Error ? err.message : 'Failed to fetch tenant', 
        isLoading: false,
        subscriptionTier: 'trial' // Fallback to safest tier
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