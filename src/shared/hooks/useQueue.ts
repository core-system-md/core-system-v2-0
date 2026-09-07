import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../infrastructure/supabase/client';
import { useQueueChannel } from '../../core/realtime/useQueueChannel';
import { useQueueStore, type QueueItem } from '../store/queueStore';
import { useAuthStore } from '../../shared/store/authStore';
import { classifyPatient } from '../../core/rules/scoring';
import type { PatientClass } from '../../core/rules/scoring';

const QUEUE_KEY = 'live-queue';

export function useQueue() {
  const tenantId = useAuthStore((s) => s.tenant_id);
  const { setItems, setLoading } = useQueueStore();

  useQueueChannel(tenantId || '');

  const query = useQuery({
    queryKey: [QUEUE_KEY, tenantId],
    queryFn: async (): Promise<QueueItem[]> => {
      if (!tenantId) throw new Error('MISSING_TENANT_ID');

      // Reception PIN authentication is separate from Supabase Auth. Use the
      // same tenant-scoped table access already used by ReceptionDashboard.
      const { data: sessions, error: sessionsError } = await supabase
        .from('clinic_visit_sessions')
        .select(
          'id, patient_id, doctor_id, room_id, procedure_id, session_status, core_score_display, is_insured, lock_holder_id, waiting_time_minutes, arrived_at, session_started_at, created_at'
        )
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .not('session_status', 'in', '("completed","cancelled")')
        .order('created_at', { ascending: true });

      if (sessionsError) throw sessionsError;
      if (!sessions?.length) return [];

      const patientIds = [...new Set(sessions.map((row) => row.patient_id).filter(Boolean))] as string[];
      const userIds = [...new Set(sessions.flatMap((row) => [row.doctor_id, row.lock_holder_id]).filter(Boolean))] as string[];
      const procedureIds = [...new Set(sessions.map((row) => row.procedure_id).filter(Boolean))] as string[];

      const [patientsResult, usersResult, proceduresResult] = await Promise.all([
        patientIds.length
          ? supabase
              .from('clinic_patients')
              .select('id, full_name')
              .eq('tenant_id', tenantId)
              .is('deleted_at', null)
              .in('id', patientIds)
          : Promise.resolve({ data: [], error: null }),
        userIds.length
          ? supabase
              .from('clinic_users')
              .select('id, full_name')
              .eq('tenant_id', tenantId)
              .is('deleted_at', null)
              .in('id', userIds)
          : Promise.resolve({ data: [], error: null }),
        procedureIds.length
          ? supabase
              .from('clinic_procedures')
              .select('id, procedure_name')
              .eq('tenant_id', tenantId)
              .is('deleted_at', null)
              .in('id', procedureIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (patientsResult.error) throw patientsResult.error;
      if (usersResult.error) throw usersResult.error;
      if (proceduresResult.error) throw proceduresResult.error;

      const patientsById = new Map((patientsResult.data || []).map((row) => [row.id, row]));
      const usersById = new Map((usersResult.data || []).map((row) => [row.id, row]));
      const proceduresById = new Map((proceduresResult.data || []).map((row) => [row.id, row]));

      return sessions.map((row) => {
        const waitMinutes = Number(row.waiting_time_minutes ?? 0);
        const score = row.core_score_display as number | null;

        let priority: PatientClass = 'medium_priority';
        if (score !== null) priority = classifyPatient(score);

        let slaStatus: 'green' | 'yellow' | 'red' = 'green';
        if (waitMinutes >= 25) slaStatus = 'red';
        else if (waitMinutes >= 15) slaStatus = 'yellow';

        const patient = row.patient_id ? patientsById.get(row.patient_id) : undefined;
        const doctor = row.doctor_id ? usersById.get(row.doctor_id) : undefined;
        const lockHolder = row.lock_holder_id ? usersById.get(row.lock_holder_id) : undefined;
        const procedure = row.procedure_id ? proceduresById.get(row.procedure_id) : undefined;

        return {
          sessionId: row.id,
          patientId: row.patient_id,
          patientName: patient?.full_name ?? 'Unknown',
          priority,
          slaStatus,
          waitMinutes,
          lockHolderId: row.lock_holder_id,
          lockHolderName: lockHolder?.full_name ?? null,
          roomId: row.room_id,
          doctorId: doctor?.id ?? row.doctor_id,
          procedureName: procedure?.procedure_name ?? null,
          coreScoreDisplay: score,
        };
      });
    },
    enabled: !!tenantId,
    refetchInterval: 30000,
  });

  useEffect(() => {
    setLoading(query.isLoading);
    if (query.data) setItems(query.data);
  }, [query.data, query.isLoading, setItems, setLoading]);

  return query;
}
