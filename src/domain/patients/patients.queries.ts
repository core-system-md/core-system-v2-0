import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../infrastructure/supabase/client';
import type { ClinicPatient } from '../../shared/types/database';

const PATIENT_KEY = 'patients';

export function usePatient(patientId: string) {
  return useQuery({
    queryKey: [PATIENT_KEY, patientId],
    queryFn: async (): Promise<ClinicPatient> => {
      const { data, error } = await supabase
        .from('clinic_patients')
        .select('*')
        .eq('id', patientId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!patientId,
  });
}

export function usePatientsByTenant(tenantId: string) {
  return useQuery({
    queryKey: [PATIENT_KEY, 'tenant', tenantId],
    queryFn: async (): Promise<ClinicPatient[]> => {
      const { data, error } = await supabase
        .from('clinic_patients')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('full_name', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
  });
}

export function usePatientSearch(tenantId: string, query: string) {
  return useQuery({
    queryKey: [PATIENT_KEY, 'search', tenantId, query],
    queryFn: async (): Promise<ClinicPatient[]> => {
      const { data, error } = await supabase
        .from('clinic_patients')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%,mrn.ilike.%${query}%`)
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId && query.length >= 2,
  });
}
