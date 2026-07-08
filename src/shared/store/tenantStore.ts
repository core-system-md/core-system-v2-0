import { create } from 'zustand';
import { supabase } from '@/infrastructure/supabase/client';

export interface TenantData {
  clinicName: string | null;
  subscriptionTier: string;
  primaryColor: string;
  logoUrl: string | null;
}

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
  setTenantId: (id: string, tenantData?: TenantData | null) => void;
  clearTenant: () => void;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id?: string | null) {
  if (!id) return false;
  return UUID_REGEX.test(id);
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

    if (!isValidUUID(tenantId)) {
      console.error('[tenantStore] Invalid tenantId, skipping fetch:', tenantId);
      set({
        error: 'INVALID_TENANT_ID',
        isLoading: false,
        subscriptionTier: 'trial',
      });
      return;
    }

    // DEBUG: Trace fetch start
    console.log('[TENANT STORE] fetch start', { tenantId });

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('master_tenants')
        .select('id, clinic_name, subscription_tier, primary_color, logo_url')
        .eq('id', tenantId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) {
        console.error('[tenantStore] Supabase error fetching tenant:', error);
        set({
          error: error?.message || 'SUPABASE_ERROR',
          isLoading: false,
          subscriptionTier: 'trial',
        });
        return;
      }

      if (!data) {
        console.warn('[tenantStore] Tenant not found for id:', tenantId);
        set({
          error: 'TENANT_NOT_FOUND',
          isLoading: false,
          subscriptionTier: 'trial',
        });
        return;
      }

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

  setTenantId: (id: string, tenantData?: TenantData | null) => {
    if (tenantData) {
      // Use provided tenant data (bypasses RLS re-query)
      console.log('[tenantStore] setTenantId with data', { id, clinicName: tenantData.clinicName });
      set({
        tenantId: id,
        clinicName: tenantData.clinicName || null,
        subscriptionTier: tenantData.subscriptionTier || 'trial',
        primaryColor: tenantData.primaryColor || '#1B2A4A',
        logoUrl: tenantData.logoUrl || null,
        isLoading: false,
        error: null,
      });
    } else {
      // Fallback: fetch from DB (may fail with RLS in PIN auth)
      console.log('[tenantStore] setTenantId without data, will fetch', { id });
      set({ tenantId: id });
      get().fetchTenant();
    }
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