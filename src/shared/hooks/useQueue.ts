// Live queue with realtime subscription

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../infrastructure/supabase/client';
import { useQueueChannel } from '../../core/realtime/useQueueChannel';
import { useQueueStore, type QueueItem } from '../store/queueStore';
import { useAuthContext } from '../../core/auth/AuthProvider';

const QUEUE_KEY = 'live-queue';

export function useQueue() {
  const { tenantId } = useAuthContext();
  const { setItems, setLoading } = useQueueStore();

  useQueueChannel(tenantId || "");

  const query = useQuery({
    queryKey: [QUEUE_KEY, tenantId],
    queryFn: async (): Promise<QueueItem[]> => {
      if (!tenantId) throw new Error('MISSING_TENANT_ID');

      const { data, error } = await supabase
        .from('clinic_visit_sessions')
        .select(`
          id,
          patient_id,
          session_status,
          actual_check_in,
          actual_start,
          lock_holder_id,
          wait_time_minutes,
          core_score_display,
          is_insured,
          clinic_patients!inner(full_name),
          clinic_users!inner(full_name),
          clinic_procedures(name)
        `)
        .eq('tenant_id', tenantId)
        .in('session_status', ['waiting', 'in_consultation'])
        .order('actual_check_in', { ascending: true });

      if (error) throw error;

      return (data || []).map((row: Record<string, unknown>) => {
        const waitMinutes = row.wait_time_minutes as number ?? 0;
        const score = row.core_score_display as number | null;

        let priority: QueueItem['priority'] = 'medium_priority';
        if (score !== null) {
          if (score >= 90) priority = 'hot_lead';
          else if (score >= 80) priority = 'qualified';
          else if (score >= 60) priority = 'high_priority';
          else if (score >= 40) priority = 'medium_priority';
          else priority = 'low_priority';
        }

        let slaStatus: 'green' | 'yellow' | 'red' = 'green';
        if (waitMinutes >= 25) slaStatus = 'red';
        else if (waitMinutes >= 15) slaStatus = 'yellow';

        const lockHolder = row.clinic_users as Record<string, string> | null;

        return {
          sessionId: row.id as string,
          patientId: row.patient_id as string,
          patientName: (row.clinic_patients as Record<string, string>)?.full_name ?? 'Unknown',
          priority,
          slaStatus,
          waitMinutes,
          lockHolderId: row.lock_holder_id as string | null,
          lockHolderName: lockHolder?.full_name ?? null,
          roomId: null,
          doctorId: null,
          procedureName: (row.clinic_procedures as Record<string, string>)?.name ?? null,
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
