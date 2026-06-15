import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../infrastructure/supabase/client';
import type { SubscriptionTier } from '../../shared/store/tenantStore';

const TENANT_KEY = 'tenant';

export function useUpdateTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { tenantId: string; newTier: SubscriptionTier }) => {
      const { data, error } = await supabase
        .from('master_tenants')
        .update({ subscription_tier: payload.newTier })
        .eq('id', payload.tenantId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, 'all'] });
    },
  });
}

export function useActivateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tenantId: string) => {
      const { data, error } = await supabase
        .from('master_tenants')
        .update({ is_active: true })
        .eq('id', tenantId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, 'all'] });
    },
  });
}

export function useUpdateTenantSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { tenantId: string; settings: Record<string, unknown> }) => {
      const { data, error } = await supabase
        .from('master_tenants')
        .update({ settings: payload.settings })
        .eq('id', payload.tenantId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, variables.tenantId] });
    },
  });
}
