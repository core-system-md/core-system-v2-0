// src/shared/hooks/useTenant.ts
// Fetch tenant config with caching

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../infrastructure/supabase/client';
import type { TenantConfig } from '../store/tenantStore';

const TENANT_KEY = 'tenant-config';

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
      
      return {
        id: data.id,
        slug: data.slug,
        name: data.name,
        nameAr: data.name_ar,
        subscriptionTier: data.subscription_tier,
        currency: data.currency,
        currencySubunit: data.currency_subunit,
        timezone: data.timezone,
        primaryColor: data.primary_color,
        logoUrl: data.logo_url,
        maxUsers: data.max_users,
        maxPatients: data.max_patients,
        maxProceduresPerMonth: data.max_procedures_per_month,
        maxDevices: data.max_devices,
        licenseKey: data.license_key,
        isActive: data.is_active,
        settings: data.settings ?? {},
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
