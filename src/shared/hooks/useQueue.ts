import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../infrastructure/supabase/client';
import { useQueueChannel } from '../../core/realtime/useQueueChannel';
import { useQueueStore, type QueueItem } from '../store/queueStore';
import { useAuthStore } from '../../shared/store/authStore';
import { classifyPatient } from '../../core/rules/scoring';
import type { PatientClass } from '../../core/rules/scoring';
import { PIN_SESSION_STORAGE_KEY } from '../../core/auth/PinAuthProvider';

const QUEUE_KEY = 'live-queue';

type QueueRpcRow = {
  id: string;
  patient_id: string | null;
  doctor_id: string | null;
  room_id: string | null;
  session_status: string;
  core_score_display: number | null;
  is_insured: boolean | null;
  lock_holder_id: string | null;
  wait_time_minutes: number | null;
  clinic_patients: { full_name?: string | null } | null;
  clinic_users: { full_name?: string | null } | null;
  clinic_procedures: { procedure_name?: string | null } | null;
};

export function useQueue() {
  const tenantId = useAuthStore((s) => s.tenant_id);
  const isPinAuthenticated = useAuthStore((s) => s.isPinAuthenticated);
  const { setItems, setLoading } = useQueueStore();

  useQueueChannel(tenantId || '');

  const query = useQuery({
    queryKey: [QUEUE_KEY, tenantId, isPinAuthenticated],
    queryFn: async (): Promise<QueueItem[]> => {
      if (!tenantId) throw new Error('MISSING_TENANT_ID');

      const sessionToken = sessionStorage.getItem(PIN_SESSION_STORAGE_KEY);
      if (!sessionToken) throw new Error('MISSING_PIN_SESSION');

      const { data, error } = await supabase.rpc('get_queue_for_pin_session', {
        p_tenant_id: tenantId,
        p_session_token: sessionToken,
      });

      if (error) throw error;

      return ((data ?? []) as QueueRpcRow[]).map((row) => {
        const waitMinutes = Number(row.wait_time_minutes ?? 0);
        const score = row.core_score_display;

        let priority: PatientClass = 'medium_priority';
        if (score !== null) priority = classifyPatient(score);

        let slaStatus: 'green' | 'yellow' | 'red' = 'green';
        if (waitMinutes >= 25) slaStatus = 'red';
        else if (waitMinutes >= 15) slaStatus = 'yellow';

        return {
          sessionId: row.id,
          patientId: row.patient_id,
          patientName: row.clinic_patients?.full_name ?? 'Unknown',
          priority,
          slaStatus,
          waitMinutes,
          lockHolderId: row.lock_holder_id,
          lockHolderName: row.clinic_users?.full_name ?? null,
          roomId: row.room_id,
          doctorId: row.doctor_id,
          procedureName: row.clinic_procedures?.procedure_name ?? null,
          coreScoreDisplay: score,
        };
      });
    },
    enabled: !!tenantId && isPinAuthenticated,
    refetchInterval: 30000,
  });

  useEffect(() => {
    setLoading(query.isLoading);
    if (query.data) setItems(query.data);
  }, [query.data, query.isLoading, setItems, setLoading]);

  return query;
}
