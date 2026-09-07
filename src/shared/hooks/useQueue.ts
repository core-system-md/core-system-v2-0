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

      const { data, error } = await supabase
        .rpc('get_queue_for_tenant', { p_tenant_id: tenantId });

      if (error) throw error;

      return (data || []).map((row: Record<string, unknown>) => {
        const waitMinutes = Number(row.wait_time_minutes ?? 0);
        const score = row.core_score_display as number | null;

        let priority: PatientClass = 'medium_priority';
        if (score !== null) {
          priority = classifyPatient(score);
        }

        let slaStatus: 'green' | 'yellow' | 'red' = 'green';
        if (waitMinutes >= 25) slaStatus = 'red';
        else if (waitMinutes >= 15) slaStatus = 'yellow';

        const patients = row.clinic_patients as Record<string, unknown> | null;
        const users = row.clinic_users as Record<string, unknown> | null;
        const procedures = row.clinic_procedures as Record<string, unknown> | null;

        return {
          sessionId: row.id as string,
          patientId: row.patient_id as string,
          patientName: (patients?.full_name as string) ?? 'Unknown',
          priority,
          slaStatus,
          waitMinutes,
          lockHolderId: row.lock_holder_id as string | null,
          lockHolderName: (users?.full_name as string) ?? null,
          roomId: (row.room_id as string | null) ?? null,
          doctorId: (row.doctor_id as string | null) ?? null,
          procedureName:
            (procedures?.procedure_name as string) ??
            (procedures?.name as string) ??
            null,
          coreScoreDisplay: score,
        };
      });
    },
    enabled: !!tenantId,
    refetchInterval: 30000,
  });

  useEffect(() => {
    setLoading(query.isLoading);
    if (query.data) {
      setItems(query.data);
    }
  }, [query.data, query.isLoading, setItems, setLoading]);

  return query;
}
