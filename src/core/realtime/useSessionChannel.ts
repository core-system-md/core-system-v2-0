import { useEffect } from 'react';
import { supabase } from '@/infrastructure/supabase/client';
import { useAuthStore } from '@/shared/store/authStore';

export function useSessionChannel(tenantId: string, callback?: (payload: unknown) => void) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!tenantId || !isAuthenticated) return;

    const channel = supabase
      .channel(`sessions_${tenantId}`)
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
