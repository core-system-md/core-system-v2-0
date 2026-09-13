import { useEffect, useRef } from 'react';
import { supabase } from '@/infrastructure/supabase/client';
import { useAuthStore } from '@/shared/store/authStore';

export function useSessionChannel(tenantId: string, callback?: (payload: unknown) => void) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const callbackRef = useRef(callback);
  const channelIdRef = useRef<string | null>(null);

  if (channelIdRef.current === null) {
    channelIdRef.current = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!tenantId || !isAuthenticated) return;

    const channel = supabase
      .channel(`sessions_${tenantId}_${channelIdRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clinic_visit_sessions', filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          callbackRef.current?.(payload);
        }
      );

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tenantId, isAuthenticated]);
}
