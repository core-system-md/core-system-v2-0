// src/core/offline/SyncEngine.ts
// Background sync on reconnect — cloud timestamp always wins

import { supabase } from '../../infrastructure/supabase/client';
import { mutationQueue, type PendingMutation } from './MutationQueue';
import { coreDrive } from './CORE_SYSTEM_DRIVE';

export const syncEngine = {
  async sync(): Promise<{ synced: number; failed: number }> {
    let synced = 0;
    let failed = 0;

    const pending = await mutationQueue.getAllPending();

    for (const mutation of pending) {
      try {
        await mutationQueue.markSyncing(mutation.id);
        await this.applyMutation(mutation);
        await mutationQueue.remove(mutation.id);
        synced++;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        await mutationQueue.markFailed(mutation.id, message);
        failed++;
      }
    }

    return { synced, failed };
  },

  async applyMutation(mutation: PendingMutation): Promise<void> {
    const { table, operation, payload } = mutation;

    if (operation === 'create') {
      const { error } = await supabase.from(table).insert(payload);
      if (error) throw error;
    } else if (operation === 'update') {
      const { id, ...updates } = payload;
      const { error } = await supabase.from(table).update(updates).eq('id', id);
      if (error) throw error;
    } else if (operation === 'delete') {
      const { error } = await supabase.from(table).delete().eq('id', payload.id);
      if (error) throw error;
    }
  },

  async pullLatest(table: string, tenantId: string): Promise<void> {
    // Fetch latest from cloud and update IndexedDB
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    for (const row of data || []) {
      await coreDrive.put(table, row);
    }
  },
};
