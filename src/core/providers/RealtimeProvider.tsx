// ============================================================
// CORE SYSTEM v2.1 — RealtimeProvider
// Manages Supabase realtime subscriptions for queue, sessions, notification_queue.
// NEW: 2026-07-01 — Created to enable real-time updates across the app
// Constitution §8: Realtime subscriptions MUST respect tenant isolation
// ============================================================

import { useEffect, useRef } from 'react';
import { supabase } from '@/infrastructure/supabase/client';
import { useAuthStore } from '@/shared/store/authStore';

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const tenantId = useAuthStore((s) => s.tenant_id);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const subscriptionsRef = useRef<any[]>([]);

  useEffect(() => {
    // Clean up old subscriptions
    subscriptionsRef.current.forEach((sub) => sub.unsubscribe?.());
    subscriptionsRef.current = [];

    if (!tenantId || !isAuthenticated) return;

    // Subscribe to queue changes
    const queueSub = supabase
      .channel(`queue_${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clinic_visit_sessions', filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          console.log('[Realtime] Queue change:', payload);
        }
      )
      .subscribe();

    // Subscribe to session changes
    const sessionSub = supabase
      .channel(`sessions_${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clinic_visit_sessions', filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          console.log('[Realtime] Session change:', payload);
        }
      )
      .subscribe();

    // Subscribe to notification_queue
    const notifSub = supabase
      .channel(`notification_queue_${tenantId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notification_queue', filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          console.log('[Realtime] New notification:', payload);
        }
      )
      .subscribe();

    subscriptionsRef.current = [queueSub, sessionSub, notifSub];

    return () => {
      subscriptionsRef.current.forEach((sub) => sub.unsubscribe?.());
      subscriptionsRef.current = [];
    };
  }, [tenantId, isAuthenticated]);

  return <>{children}</>;
}

export default RealtimeProvider;
