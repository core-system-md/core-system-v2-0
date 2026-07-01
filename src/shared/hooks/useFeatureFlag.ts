import { useEffect, useState } from 'react';
import { supabase } from '@/infrastructure/supabase/client';
import { useTenantStore } from '@/shared/store/tenantStore';

// Constitution §8.1: Feature flags table structure
// tenant_id: UUID (NULL = global)
// flag_key: VARCHAR(100)
// is_enabled: BOOLEAN
// allowed_tiers: TEXT[]

interface FeatureFlag {
  flag_key: string;
  is_enabled: boolean;
  allowed_tiers: string[] | null;
}

/**
 * Check if a feature flag is enabled for current tenant
 * Constitution §8.2: Tier validation required
 * 
 * @param flagKey - The feature flag key (e.g., 'AI_REPORTS')
 * @returns boolean - true if enabled and tier allowed
 */
export function useFeatureFlag(flagKey: string): {
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
} {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { subscriptionTier } = useTenantStore();
  const tenantId = localStorage.getItem('tenant_id');

  useEffect(() => {
    const checkFlag = async () => {
      if (!tenantId) {
        setIsEnabled(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Step 1: Check tenant-specific flag
        const { data: tenantFlag, error: tenantError } = await supabase
          .from('feature_flags')
          .select('flag_key, is_enabled, allowed_tiers')
          .eq('tenant_id', tenantId!)
          .eq('flag_key', flagKey)
          .single();

        if (tenantError && tenantError.code !== 'PGRST116') {
          throw tenantError;
        }

        // Step 2: If no tenant-specific flag, check global flag
        let flag: FeatureFlag | null = tenantFlag;

        if (!flag) {
          const { data: globalFlag, error: globalError } = await supabase
            .from('feature_flags')
            .select('flag_key, is_enabled, allowed_tiers')
            .is('tenant_id', null)
            .eq('flag_key', flagKey)
            .single();

          if (globalError && globalError.code !== 'PGRST116') {
            throw globalError;
          }
          flag = globalFlag;
        }

        // Step 3: Validate tier + enabled status
        // Constitution §8: current_tier IN allowed_tiers AND is_enabled = true
        if (flag && flag.is_enabled) {
          const currentTier = subscriptionTier || 'trial';
          const tierAllowed = Array.isArray(flag.allowed_tiers) ? flag.allowed_tiers.includes(currentTier) : false;
          setIsEnabled(tierAllowed);
        } else {
          setIsEnabled(false);
        }

      } catch (err: unknown) {
        console.error(`[useFeatureFlag] Error checking ${flagKey}:`, err);
        setError(err instanceof Error ? err.message : 'Failed to check feature flag');
        setIsEnabled(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkFlag();
  }, [flagKey, tenantId, subscriptionTier]);

  return { isEnabled, isLoading, error };
}

/**
 * Batch check multiple feature flags
 * Optimized: single query for all flags
 */
export function useFeatureFlags(flagKeys: string[]): {
  flags: Record<string, boolean>;
  isLoading: boolean;
} {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { subscriptionTier } = useTenantStore();
  const tenantId = localStorage.getItem('tenant_id');

  useEffect(() => {
    const checkFlags = async () => {
      if (!tenantId || flagKeys.length === 0) {
        setFlags(Object.fromEntries(flagKeys.map(k => [k, false])));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Fetch tenant-specific flags
        const { data: tenantFlags, error: tenantError } = await supabase
          .from('feature_flags')
          .select('flag_key, is_enabled, allowed_tiers')
          .eq('tenant_id', tenantId!)
          .in('flag_key', flagKeys);

        if (tenantError) throw tenantError;

        // Fetch global flags for missing ones
        const foundKeys = (tenantFlags || []).map((f: FeatureFlag) => f.flag_key);
        const missingKeys = flagKeys.filter(k => !foundKeys.includes(k));

        let globalFlags: FeatureFlag[] = [];
        if (missingKeys.length > 0) {
          const { data: gFlags, error: globalError } = await supabase
            .from('feature_flags')
            .select('flag_key, is_enabled, allowed_tiers')
            .is('tenant_id', null)
            .in('flag_key', missingKeys);

          if (globalError) throw globalError;
          globalFlags = gFlags || [];
        }

        // Merge and validate tiers
        const allFlags = [...(tenantFlags || []), ...globalFlags];
        const currentTier = subscriptionTier || 'trial';

        const result: Record<string, boolean> = {};
        flagKeys.forEach(key => {
          const flag = allFlags.find((f: FeatureFlag) => f.flag_key === key);
          const allowed = Array.isArray(flag?.allowed_tiers) ? flag!.allowed_tiers!.includes(currentTier) : false;
          result[key] = flag ? flag.is_enabled && allowed : false;
        });

        setFlags(result);

      } catch (err: unknown) {
        console.error('[useFeatureFlags] Error:', err);
        setFlags(Object.fromEntries(flagKeys.map(k => [k, false])));
      } finally {
        setIsLoading(false);
      }
    };

    checkFlags();
  }, [flagKeys.join(','), tenantId, subscriptionTier]);

  return { flags, isLoading };
}