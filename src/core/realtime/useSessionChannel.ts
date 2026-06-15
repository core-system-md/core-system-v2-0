// src/core/realtime/useSessionChannel.ts
// Session status changes broadcast

import { useEffect } from 'react';
import { useRealtimeContext } from './RealtimeProvider';

export function useSessionChannel(sessionId: string, onChange: (status: string) => void) {
  const { subscribeToTable } = useRealtimeContext();

  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = subscribeToTable('clinic_visit_sessions', (payload) => {
      const { eventType, new: newRecord } = payload as {
        eventType: string;
        new: { id: string; session_status: string };
      };

      if (eventType === 'UPDATE' && newRecord?.id === sessionId) {
        onChange(newRecord.session_status);
      }
    });

    return unsubscribe;
  }, [sessionId, onChange, subscribeToTable]);
}
