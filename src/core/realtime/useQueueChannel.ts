// src/core/realtime/useQueueChannel.ts
// Live queue updates broadcast

import { useEffect } from 'react';
import { useRealtimeContext } from './RealtimeProvider';
import { useQueueStore } from '../../shared/store/queueStore';

export function useQueueChannel(tenantId: string) {
  const { subscribeToTable } = useRealtimeContext();
  const { updateItem, removeItem } = useQueueStore();

  useEffect(() => {
    if (!tenantId) return;

    const unsubscribe = subscribeToTable('clinic_visit_sessions', (payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload as {
        eventType: string;
        new: Record<string, unknown>;
        old: Record<string, unknown>;
      };

      if (eventType === 'UPDATE' && newRecord) {
        updateItem(newRecord.id as string, {
          lockHolderId: newRecord.lock_holder_id as string | null,
          lockHolderName: newRecord.lock_holder_name as string | null,
          waitMinutes: newRecord.wait_time_minutes as number,
          coreScoreDisplay: newRecord.core_score_display as number | null,
        });
      }

      if (eventType === 'DELETE' && oldRecord) {
        removeItem(oldRecord.id as string);
      }
    });

    return unsubscribe;
  }, [tenantId, subscribeToTable, updateItem, removeItem]);
}
