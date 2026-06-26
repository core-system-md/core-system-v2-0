import { create } from 'zustand';
import { supabase } from '@/infrastructure/supabase/client';

// Constitution §8.1: Feature flag types
interface FeatureFlag {
  id: string;
  tenant_id: string | null;
  flag_key: string;
  flag_name: string;
  description: string | null;
  is_enabled: boolean;
  allowed_tiers: string[];
  config_json: Record<string, any>;
}

interface FeatureFlagState {
  flags: FeatureFlag[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;

  // Actions
  fetchFlags: () => Promise<void>;
  isFlagEnabled: (flagKey: string, currentTier: string) => boolean;
  refreshFlags: () => Promise<void>;
}

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

export const useFeatureFlagStore = create<FeatureFlagState>((set, get) => ({
  flags: [],
  isLoading: false,
  error: null,
  lastFetched: null,

  fetchFlags: async () => {
    const { lastFetched } = get();

    // Return cached data if valid
    if (lastFetched && Date.now() - lastFetched < CACHE_DURATION) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const tenantId = localStorage.getItem('tenant_id');

      if (!tenantId) {
        set({ flags: [], isLoading: false, lastFetched: Date.now() });
        return;
      }

      // Fetch tenant-specific + global flags
      const { data, error } = await supabase
        .from('feature_flags')
        .select('id, tenant_id, flag_key, flag_name, description, is_enabled, allowed_tiers, config_json')
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`);

      if (error) throw error;

      set({ 
        flags: data || [], 
        isLoading: false, 
        lastFetched: Date.now(),
        error: null 
      });

    } catch (err: any) {
      console.error('[featureFlagStore] Fetch error:', err);
      set({ 
        error: err.message, 
        isLoading: false,
        lastFetched: Date.now() 
      });
    }
  },

  isFlagEnabled: (flagKey: string, currentTier: string): boolean => {
    const { flags } = get();

    // Priority: tenant-specific > global
    const tenantFlag = flags.find(f => f.flag_key === flagKey && f.tenant_id !== null);
    const globalFlag = flags.find(f => f.flag_key === flagKey && f.tenant_id === null);

    const flag = tenantFlag || globalFlag;

    if (!flag) return false;
    if (!flag.is_enabled) return false;

    // Constitution §8.2: Tier validation
    return flag.allowed_tiers.includes(currentTier);
  },

  refreshFlags: async () => {
    set({ lastFetched: null });
    await get().fetchFlags();
  }
}));