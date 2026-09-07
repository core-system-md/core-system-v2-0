import { useEffect, useRef } from 'react';
import { supabase } from '@/infrastructure/supabase/client';
import { useAuthStore } from '@/shared/store/authStore';
import { PIN_SESSION_STORAGE_KEY } from '@/core/auth/PinAuthProvider';

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function useQueueChannel(tenantId: string, callback?: (payload: unknown) => void) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isPinAuthenticated = useAuthStore((s) => s.isPinAuthenticated);
  const instanceId = useRef(`_${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    if (!tenantId) return;

    let disposed = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribe = async () => {
      if (isPinAuthenticated) {
        const sessionToken = sessionStorage.getItem(PIN_SESSION_STORAGE_KEY);
        if (!sessionToken) return;

        const tokenHash = await sha256Hex(sessionToken);
        if (disposed) return;

        channel = supabase
          .channel(`reception_queue:${tenantId}:${tokenHash}${instanceId.current}`)
          .on('broadcast', { event: 'queue_changed' }, (payload) => {
            callback?.(payload);
          });
      } else if (isAuthenticated) {
        channel = supabase
          .channel(`queue_${tenantId}${instanceId.current}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'clinic_visit_sessions',
              filter: `tenant_id=eq.${tenantId}`,
            },
            (payload) => {
              callback?.(payload);
            }
          );
      } else {
        return;
      }

      if (!channel) return;

      channel.subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Queue realtime channel failed:', status);
        }
      });
    };

    void subscribe();

    return () => {
      disposed = true;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [tenantId, isAuthenticated, isPinAuthenticated, callback]);
}
