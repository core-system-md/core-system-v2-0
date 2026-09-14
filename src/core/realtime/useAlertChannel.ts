import { useEffect } from 'react';
import { supabase } from '@/infrastructure/supabase/client';
import { useAuthStore } from '@/shared/store/authStore';

export function useAlertChannel(tenantId: string, callback?: (payload: unknown) => void) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const session = useAuthStore((s) => s.session);

  useEffect(() => {
    // PIN sessions are application-authenticated but intentionally have no
    // Supabase Auth JWT. postgres_changes requires a real Supabase session.
    if (!tenantId || !isAuthenticated || !session) return;

    const channel = supabase
      .channel(`alerts_${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_delivery_breaches', filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          if (callback) callback(payload);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tenantId, isAuthenticated, session, callback]);
}
