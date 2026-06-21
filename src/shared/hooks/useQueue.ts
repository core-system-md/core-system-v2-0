import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../infrastructure/supabase/client';
import { useQueueChannel } from '../../core/realtime/useQueueChannel';
import { useQueueStore, type QueueItem } from '../store/queueStore';
import { useAuthContext } from '../../core/auth/AuthProvider';

const QUEUE_KEY = 'live-queue';

export function useQueue() {
  const { tenantId: authTenantId } = useAuthContext();
  
  let tenantId = authTenantId;
  if (!tenantId) {
    try {
      const pinAuth = localStorage.getItem('pin_auth');
      if (pinAuth) {
        const parsed = JSON.parse(pinAuth);
        if (parsed.tenantId && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          tenantId = parsed.tenantId;
        }
      }
    } catch { /* ignore */ }
  }
  
  const { setItems, setLoading } = useQueueStore();

  console.log('DEBUG: tenantId =', tenantId);

  useQueueChannel(tenantId || '');

  const query = useQuery({
    queryKey: [QUEUE_KEY, tenantId],
    queryFn: async (): Promise<QueueItem[]> => {
      if (!tenantId) throw new Error('MISSING_TENANT_ID');

      const { data, error } = await supabase
        .rpc('get_queue_for_tenant', { p_tenant_id: tenantId });

      if (error) {
        console.error('DEBUG: Supabase error:', error);
        throw error;
      }
      console.log('DEBUG: fetched', data?.length, 'rows');

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

        const patients = row.clinic_patients as Record<string, string> | null;
        const users = row.clinic_users as Record<string, string> | null;
        const procedures = row.clinic_procedures as Record<string, string> | null;

        return {
          sessionId: row.id as string,
          patientId: row.patient_id as string,
          patientName: patients?.full_name ?? 'Unknown',
          priority,
          slaStatus,
          waitMinutes,
          lockHolderId: row.lock_holder_id as string | null,
          lockHolderName: users?.full_name ?? null,
          roomId: null,
          doctorId: null,
          procedureName: procedures?.name ?? null,
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
