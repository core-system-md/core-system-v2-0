import { useEffect, useState } from 'react';
import { supabase } from '@/infrastructure/supabase/client';
import { useTenantStore } from '@/shared/store/tenantStore';
import { useAuthStore } from '@/shared/store/authStore';

// Constitution §8.1: Feature flag types

export function useFeatureFlag(flagKey: string): {
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
} {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = useAuthStore((s) => s.tenant_id);
  const currentTier = useTenantStore((s) => s.subscriptionTier);

  useEffect(() => {
    if (!tenantId) {
      setIsEnabled(false);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function check() {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch tenant-specific + global flags
        const { data, error: supaError } = await supabase
          .from('feature_flags')
          .select('id, tenant_id, flag_key, flag_name, description, is_enabled, allowed_tiers, config_json')
          .eq('flag_key', flagKey)
          .or(`tenant_id.eq.${tenantId},tenant_id.is.null`);

        if (supaError) throw supaError;

        const rows: any[] = (data || []) as any[];

        // Priority: tenant-specific > global
        const tenantFlag = rows.find(r => r.tenant_id !== null);
        const globalFlag = rows.find(r => r.tenant_id === null);
        const flag = tenantFlag || globalFlag;

        if (!flag) {
          if (!cancelled) setIsEnabled(false);
          return;
        }

        if (!flag.is_enabled) {
          if (!cancelled) setIsEnabled(false);
          return;
        }

        // Constitution §8.2: Tier validation
        const allowedTiers = flag.allowed_tiers ?? [];
        const hasTierAccess = Array.isArray(allowedTiers) && allowedTiers.includes(currentTier || 'trial');

        if (!cancelled) setIsEnabled(hasTierAccess);

      } catch (err: unknown) {
        if (!cancelled) {
          console.error(`[useFeatureFlag] Error checking ${flagKey}:`, err);
          setError(err instanceof Error ? err.message : 'Failed to check feature flag');
          setIsEnabled(false);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    check();
    return () => { cancelled = true; };
  }, [flagKey, tenantId, currentTier]);

  return { isEnabled, isLoading, error };
}

export function useFeatureFlags(flagKeys: string[]): {
  flags: Record<string, boolean>;
  isLoading: boolean;
  error: string | null;
} {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = useAuthStore((s) => s.tenant_id);
  const currentTier = useTenantStore((s) => s.subscriptionTier);

  useEffect(() => {
    if (!tenantId || flagKeys.length === 0) {
      setFlags({});
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function checkAll() {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: supaError } = await supabase
          .from('feature_flags')
          .select('id, tenant_id, flag_key, flag_name, description, is_enabled, allowed_tiers, config_json')
          .in('flag_key', flagKeys)
          .or(`tenant_id.eq.${tenantId},tenant_id.is.null`);

        if (supaError) throw supaError;

        const rows: any[] = (data || []) as any[];
        const result: Record<string, boolean> = {};

        for (const key of flagKeys) {
          const tenantFlag = rows.find(r => r.flag_key === key && r.tenant_id !== null);
          const globalFlag = rows.find(r => r.flag_key === key && r.tenant_id === null);
          const flag = tenantFlag || globalFlag;

          if (!flag || !flag.is_enabled) {
            result[key] = false;
            continue;
          }

          const allowedTiers = flag.allowed_tiers ?? [];
          result[key] = Array.isArray(allowedTiers) && allowedTiers.includes(currentTier || 'trial');
        }

        if (!cancelled) setFlags(result);
      } catch (err: unknown) {
        if (!cancelled) {
          console.error('[useFeatureFlags] Error:', err);
          setError(err instanceof Error ? err.message : 'Unknown error');
          setFlags({});
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    checkAll();
    return () => { cancelled = true; };
  }, [flagKeys.join(','), tenantId, currentTier]);

  return { flags, isLoading, error };
}
