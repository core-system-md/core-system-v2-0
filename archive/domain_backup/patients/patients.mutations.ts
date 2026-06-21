import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../infrastructure/supabase/client';
import type { ClinicPatient } from '../../shared/types/database';

const PATIENT_KEY = 'patients';

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patient: Omit<ClinicPatient, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('clinic_patients')
        .insert(patient)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PATIENT_KEY, 'tenant', variables.tenant_id] });
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string; updates: Partial<ClinicPatient> }) => {
      const { data, error } = await supabase
        .from('clinic_patients')
        .update(payload.updates)
        .eq('id', payload.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PATIENT_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: [PATIENT_KEY, 'tenant'] });
    },
  });
}

export function useSoftDeletePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patientId: string) => {
      const { data, error } = await supabase
        .from('clinic_patients')
        .update({ is_active: false })
        .eq('id', patientId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, patientId) => {
      queryClient.invalidateQueries({ queryKey: [PATIENT_KEY, patientId] });
      queryClient.invalidateQueries({ queryKey: [PATIENT_KEY, 'tenant'] });
    },
  });
}
