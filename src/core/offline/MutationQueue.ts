// src/core/offline/MutationQueue.ts
// Pending operations FIFO queue for offline sync

import { coreDrive } from './CORE_SYSTEM_DRIVE';

export interface PendingMutation {
  id: string;
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed';
  table: string;
  operation: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>;
  retryCount: number;
  errorMessage?: string;
}

const MUTATION_STORE = 'mutations';

export const mutationQueue = {
  async enqueue(mutation: Omit<PendingMutation, 'id' | 'timestamp' | 'status' | 'retryCount'>): Promise<void> {
    const item: PendingMutation = {
      ...mutation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
    };
    await coreDrive.put(MUTATION_STORE, item);
  },

  async dequeue(): Promise<PendingMutation | undefined> {
    const all = await coreDrive.getByIndex<PendingMutation>(MUTATION_STORE, 'byStatus', 'pending');
    if (all.length === 0) return undefined;
    // Sort by timestamp (FIFO)
    all.sort((a, b) => a.timestamp - b.timestamp);
    return all[0];
  },

  async markSyncing(id: string): Promise<void> {
    const item = await coreDrive.get<PendingMutation>(MUTATION_STORE, id);
    if (item) {
      item.status = 'syncing';
      await coreDrive.put(MUTATION_STORE, item);
    }
  },

  async markFailed(id: string, error: string): Promise<void> {
    const item = await coreDrive.get<PendingMutation>(MUTATION_STORE, id);
    if (item) {
      item.status = 'failed';
      item.retryCount += 1;
      item.errorMessage = error;
      await coreDrive.put(MUTATION_STORE, item);
    }
  },

  async remove(id: string): Promise<void> {
    await coreDrive.delete(MUTATION_STORE, id);
  },

  async getAllPending(): Promise<PendingMutation[]> {
    const all = await coreDrive.getByIndex<PendingMutation>(MUTATION_STORE, 'byStatus', 'pending');
    return all.sort((a, b) => a.timestamp - b.timestamp);
  },

  async getFailed(): Promise<PendingMutation[]> {
    const all = await coreDrive.getByIndex<PendingMutation>(MUTATION_STORE, 'byStatus', 'failed');
    return all;
  },

  async clear(): Promise<void> {
    await coreDrive.clear(MUTATION_STORE);
  },
};
