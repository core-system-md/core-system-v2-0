import { useEffect, useState } from 'react';
import { supabase } from '@/infrastructure/supabase/client';
import { useTenantStore } from '@/shared/store/tenantStore';

interface FeatureFlag {
  flag_key: string;
  is_enabled: boolean;
  allowed_tiers: string[] | null;
}

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
        const { data: tenantFlag, error: tenantError } = await supabase
          .from('feature_flags')
          .select('flag_key, is_enabled, allowed_tiers')
          .eq('tenant_id', tenantId)
          .eq('flag_key', flagKey)
          .single();

        if (tenantError && tenantError.code !== 'PGRST116') {
          throw tenantError;
        }

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

        if (flag && flag.is_enabled) {
          const currentTier = subscriptionTier || 'trial';
          const tierAllowed = flag.allowed_tiers?.includes(currentTier) ?? false;
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
        const { data: tenantFlags, error: tenantError } = await supabase
          .from('feature_flags')
          .select('flag_key, is_enabled, allowed_tiers')
          .eq('tenant_id', tenantId)
          .in('flag_key', flagKeys);

        if (tenantError) throw tenantError;

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

        const allFlags = [...(tenantFlags || []), ...globalFlags];
        const currentTier = subscriptionTier || 'trial';

        const result: Record<string, boolean> = {};
        flagKeys.forEach(key => {
          const flag = allFlags.find((f: FeatureFlag) => f.flag_key === key);
          result[key] = flag ? flag.is_enabled && (flag.allowed_tiers?.includes(currentTier) ?? false) : false;
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
