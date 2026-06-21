import { useQuery } from '@tanstack/react-query';
import { supabase } from '../infrastructure/supabase/client';
import type { SessionStatus } from '../shared/types/database';

export interface SessionRow {
  id: string;
  tenant_id: string;
  patient_id: string;
  patient_name: string;
  doctor_id: string | null;
  doctor_name: string | null;
  room_id: string | null;
  room_name: string | null;
  session_status: SessionStatus;
  actual_check_in: string | null;
  actual_start: string | null;
  actual_end: string | null;
  payment_status: string;
  total_charge_subunits: number | null;
}

const SESSION_KEY = 'sessions';

export function useSession(sessionId: string) {
  return useQuery({
    queryKey: [SESSION_KEY, sessionId],
    queryFn: async (): Promise<SessionRow> => {
      const { data, error } = await supabase
        .from('clinic_visit_sessions')
        .select(`
          id,
          tenant_id,
          patient_id,
          primary_doctor_id,
          assigned_room_id,
          session_status,
          actual_check_in,
          actual_start,
          actual_end,
          payment_status,
          total_charge_subunits,
          clinic_patients(full_name),
          clinic_users(id, full_name),
          clinic_rooms(id, name)
        `)
        .eq('id', sessionId)
        .single();
      if (error) throw error;
      return {
        id: data.id,
        tenant_id: data.tenant_id,
        patient_id: data.patient_id,
        patient_name: (data.clinic_patients as unknown as { full_name: string })?.full_name ?? 'Unknown',
        doctor_id: data.primary_doctor_id,
        doctor_name: (data.clinic_users as unknown as { full_name: string } | null)?.full_name ?? null,
        room_id: data.assigned_room_id,
        room_name: (data.clinic_rooms as unknown as { name: string } | null)?.name ?? null,
        session_status: data.session_status as SessionStatus,
        actual_check_in: data.actual_check_in,
        actual_start: data.actual_start,
        actual_end: data.actual_end,
        payment_status: data.payment_status,
        total_charge_subunits: data.total_charge_subunits,
      };
    },
    enabled: !!sessionId,
  });
}

export function useSessionsByTenant(tenantId: string, status?: SessionStatus) {
  return useQuery({
    queryKey: [SESSION_KEY, 'tenant', tenantId, status],
    queryFn: async (): Promise<SessionRow[]> => {
      let query = supabase
        .from('clinic_visit_sessions')
        .select(`
          id,
          tenant_id,
          patient_id,
          primary_doctor_id,
          assigned_room_id,
          session_status,
          actual_check_in,
          actual_start,
          actual_end,
          payment_status,
          total_charge_subunits,
          clinic_patients(full_name),
          clinic_users(id, full_name),
          clinic_rooms(id, name)
        `)
        .eq('tenant_id', tenantId)
        .order('actual_check_in', { ascending: false });

      if (status) {
        query = query.eq('session_status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        tenant_id: row.tenant_id,
        patient_id: row.patient_id,
        patient_name: (row.clinic_patients as unknown as { full_name: string })?.full_name ?? 'Unknown',
        doctor_id: row.primary_doctor_id,
        doctor_name: (row.clinic_users as unknown as { full_name: string } | null)?.full_name ?? null,
        room_id: row.assigned_room_id,
        room_name: (row.clinic_rooms as unknown as { name: string } | null)?.name ?? null,
        session_status: row.session_status as SessionStatus,
        actual_check_in: row.actual_check_in,
        actual_start: row.actual_start,
        actual_end: row.actual_end,
        payment_status: row.payment_status,
        total_charge_subunits: row.total_charge_subunits,
      }));
    },
    enabled: !!tenantId,
  });
}

export function useSessionsByDoctor(doctorId: string) {
  return useQuery({
    queryKey: [SESSION_KEY, 'doctor', doctorId],
    queryFn: async (): Promise<SessionRow[]> => {
      const { data, error } = await supabase
        .from('clinic_visit_sessions')
        .select(`
          id,
          tenant_id,
          patient_id,
          primary_doctor_id,
          assigned_room_id,
          session_status,
          actual_check_in,
          actual_start,
          actual_end,
          payment_status,
          total_charge_subunits,
          clinic_patients(full_name),
          clinic_users(id, full_name),
          clinic_rooms(id, name)
        `)
        .eq('primary_doctor_id', doctorId)
        .order('actual_check_in', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        tenant_id: row.tenant_id,
        patient_id: row.patient_id,
        patient_name: (row.clinic_patients as unknown as { full_name: string })?.full_name ?? 'Unknown',
        doctor_id: row.primary_doctor_id,
        doctor_name: (row.clinic_users as unknown as { full_name: string } | null)?.full_name ?? null,
        room_id: row.assigned_room_id,
        room_name: (row.clinic_rooms as unknown as { name: string } | null)?.name ?? null,
        session_status: row.session_status as SessionStatus,
        actual_check_in: row.actual_check_in,
        actual_start: row.actual_start,
        actual_end: row.actual_end,
        payment_status: row.payment_status,
        total_charge_subunits: row.total_charge_subunits,
      }));
    },
    enabled: !!doctorId,
  });
}

export function useActiveQueueSessions(tenantId: string) {
  return useQuery({
    queryKey: [SESSION_KEY, 'queue', tenantId],
    queryFn: async (): Promise<SessionRow[]> => {
      const { data, error } = await supabase
        .from('clinic_visit_sessions')
        .select(`
          id,
          tenant_id,
          patient_id,
          primary_doctor_id,
          assigned_room_id,
          session_status,
          actual_check_in,
          actual_start,
          actual_end,
          payment_status,
          total_charge_subunits,
          clinic_patients(full_name),
          clinic_users(id, full_name),
          clinic_rooms(id, name)
        `)
        .eq('tenant_id', tenantId)
        .in('session_status', ['pending', 'checked_in', 'in_progress'])
        .order('actual_check_in', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        tenant_id: row.tenant_id,
        patient_id: row.patient_id,
        patient_name: (row.clinic_patients as unknown as { full_name: string })?.full_name ?? 'Unknown',
        doctor_id: row.primary_doctor_id,
        doctor_name: (row.clinic_users as unknown as { full_name: string } | null)?.full_name ?? null,
        room_id: row.assigned_room_id,
        room_name: (row.clinic_rooms as unknown as { name: string } | null)?.name ?? null,
        session_status: row.session_status as SessionStatus,
        actual_check_in: row.actual_check_in,
        actual_start: row.actual_start,
        actual_end: row.actual_end,
        payment_status: row.payment_status,
        total_charge_subunits: row.total_charge_subunits,
      }));
    },
    enabled: !!tenantId,
    refetchInterval: 30000,
  });
}
