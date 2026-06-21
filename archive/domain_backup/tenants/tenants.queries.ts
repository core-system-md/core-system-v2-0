import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../infrastructure/supabase/client';
import type { TenantConfig, SubscriptionTier } from '../../shared/store/tenantStore';

const TENANT_KEY = 'tenant';

interface TenantRow {
  id: string;
  slug: string;
  name: string;
  subscription_tier: SubscriptionTier;
  currency: string | null;
  currency_subunit: number | null;
  timezone: string | null;
  max_users: number;
  max_patients: number;
  max_procedures_per_month: number;
  max_devices: number;
  settings: Record<string, unknown>;
}

function mapTenantRow(row: TenantRow): TenantConfig {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameAr: row.settings?.nameAr as string | null ?? null,
    subscriptionTier: row.subscription_tier,
    currency: row.currency ?? 'USD',
    currencySubunit: row.currency_subunit ?? 100,
    timezone: row.timezone ?? 'UTC',
    primaryColor: row.settings?.primaryColor as string ?? '#3B82F6',
    logoUrl: row.settings?.logoUrl as string | null ?? null,
    maxUsers: row.max_users,
    maxPatients: row.max_patients,
    maxProceduresPerMonth: row.max_procedures_per_month,
    maxDevices: row.max_devices,
    licenseKey: (row as any).license_key,
    isActive: (row as any).is_active,
    settings: row.settings ?? {},
  };
}

export function useTenant(tenantId: string) {
  return useQuery({
    queryKey: [TENANT_KEY, tenantId],
    queryFn: async (): Promise<TenantConfig> => {
      const { data, error } = await supabase
        .from('master_tenants')
        .select('*')
        .eq('id', tenantId)
        .single();
      if (error) throw error;
      return mapTenantRow(data);
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllTenants() {
  return useQuery({
    queryKey: [TENANT_KEY, 'all'],
    queryFn: async (): Promise<TenantConfig[]> => {
      const { data, error } = await supabase
        .from('master_tenants')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapTenantRow);
    },
    staleTime: 60 * 1000,
  });
}
