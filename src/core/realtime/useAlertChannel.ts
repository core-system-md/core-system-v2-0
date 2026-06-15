// src/core/realtime/useAlertChannel.ts
// Breach + SLA alerts broadcast

import { useEffect } from 'react';
import { useRealtimeContext } from './RealtimeProvider';
import { useUiStore } from '../../shared/store/uiStore';

export function useAlertChannel(tenantId: string) {
  const { subscribeToTable } = useRealtimeContext();
  const { addToast } = useUiStore();

  useEffect(() => {
    if (!tenantId) return;

    const unsubscribe = subscribeToTable('system_delivery_breaches', (payload) => {
      const { eventType, new: newRecord } = payload as {
        eventType: string;
        new: { severity: string; description: string };
      };

      if (eventType === 'INSERT' && newRecord) {
        const type = newRecord.severity === 'critical' ? 'error' : 'warning';
        addToast(newRecord.description, type, 8000);
      }
    });

    return unsubscribe;
  }, [tenantId, subscribeToTable, addToast]);
}
