import { useEffect, useRef } from 'react';
import { supabase } from '@/infrastructure/supabase/client';
import { useAuthStore } from '@/shared/store/authStore';

export function useQueueChannel(tenantId: string, callback?: (payload: unknown) => void) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const instanceId = useRef(`_${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    if (!tenantId || !isAuthenticated) return;

    const channel = supabase
      .channel(`queue_${tenantId}${instanceId.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clinic_visit_sessions', filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          if (callback) callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, isAuthenticated, callback]);
}