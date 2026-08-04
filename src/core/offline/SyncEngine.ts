// src/core/offline/SyncEngine.ts
// Background sync on reconnect — cloud timestamp always wins

import { supabase } from '../../infrastructure/supabase/client';
import { mutationQueue, type PendingMutation } from './MutationQueue';
import { coreDrive } from './CORE_SYSTEM_DRIVE';

// P37-C: Narrow dynamic table access to a typed wrapper
type SyncTableName = string;

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

    // P37-C: Isolate untyped builder to one line; keep payload typed
    const qb = supabase.from(table as SyncTableName) as unknown as {
      insert: (values: Record<string, unknown>) => Promise<{ error: Error | null }>;
      update: (values: Record<string, unknown>) => Promise<{ error: Error | null }>;
      delete: () => { eq: (column: string, value: unknown) => Promise<{ error: Error | null }> };
    };

    if (operation === 'create') {
      const { error } = await qb.insert(payload as Record<string, unknown>);
      if (error) throw error;
    } else if (operation === 'update') {
      const { id, ...updates } = payload as Record<string, unknown>;
      const { error } = await (qb as any).update(updates).eq('id', id);
      if (error) throw error;
    } else if (operation === 'delete') {
      const { error } = await (qb as any).delete().eq('id', (payload as Record<string, unknown>).id);
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

    for (const row of (data ?? []) as Record<string, unknown>[]) {
      await coreDrive.put(table, row);
    }
  },
};
