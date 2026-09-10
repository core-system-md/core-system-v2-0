import { useEffect } from 'react';
import { supabase } from '@/infrastructure/supabase/client';
import { useAuthStore } from '@/shared/store/authStore';

export function useSessionChannel(tenantId: string, callback?: (payload: unknown) => void) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!tenantId || !isAuthenticated) return;

    const channelName = `sessions_${tenantId}_${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clinic_visit_sessions', filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          callback?.(payload);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tenantId, isAuthenticated, callback]);
}
