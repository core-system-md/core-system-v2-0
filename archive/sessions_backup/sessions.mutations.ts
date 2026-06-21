import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../infrastructure/supabase/client';
import type { SessionStatus } from '../shared/types/database';

const SESSION_KEY = 'sessions';

export function useUpdateSessionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      sessionId: string;
      newStatus: SessionStatus;
      actualTimestampField?: 'actual_check_in' | 'actual_start' | 'actual_end' | 'actual_check_out';
      timestamp?: string;
    }) => {
      const updates: Record<string, unknown> = {
        session_status: payload.newStatus,
        updated_at: new Date().toISOString(),
      };
      if (payload.actualTimestampField) {
        updates[payload.actualTimestampField] = payload.timestamp ?? new Date().toISOString();
      }
      const { data, error } = await supabase
        .from('clinic_visit_sessions')
        .update(updates)
        .eq('id', payload.sessionId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SESSION_KEY, variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: [SESSION_KEY, 'tenant'] });
      queryClient.invalidateQueries({ queryKey: [SESSION_KEY, 'doctor'] });
      queryClient.invalidateQueries({ queryKey: [SESSION_KEY, 'queue'] });
    },
  });
}

export function useWriteSessionScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      sessionId: string;
      indicators: {
        score_aps?: number;
        score_dri?: number;
        score_tsi?: number;
        score_uri?: number;
        score_pqs?: number;
        score_rvs?: number;
      };
    }) => {
      const { data, error } = await supabase
        .from('clinic_visit_sessions')
        .update({
          session_metadata: { scores: payload.indicators },
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.sessionId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SESSION_KEY, variables.sessionId] });
    },
  });
}

export function useAssignDoctor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { sessionId: string; doctorId: string }) => {
      const { data, error } = await supabase
        .from('clinic_visit_sessions')
        .update({
          primary_doctor_id: payload.doctorId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.sessionId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SESSION_KEY, variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: [SESSION_KEY, 'queue'] });
    },
  });
}

export function useAssignRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { sessionId: string; roomId: string }) => {
      const { data, error } = await supabase
        .from('clinic_visit_sessions')
        .update({
          assigned_room_id: payload.roomId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.sessionId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SESSION_KEY, variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: [SESSION_KEY, 'queue'] });
    },
  });
}
