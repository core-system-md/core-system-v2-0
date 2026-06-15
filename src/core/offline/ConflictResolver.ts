// src/core/offline/ConflictResolver.ts
// Cloud timestamp always wins — simplest conflict resolution

import { coreDrive } from './CORE_SYSTEM_DRIVE';

export interface ConflictRecord {
  local: Record<string, unknown>;
  cloud: Record<string, unknown>;
  table: string;
}

export const conflictResolver = {
  resolve(conflict: ConflictRecord): Record<string, unknown> {
    // Rule: Cloud timestamp always wins
    const localUpdated = new Date(conflict.local.updated_at as string).getTime();
    const cloudUpdated = new Date(conflict.cloud.updated_at as string).getTime();

    if (cloudUpdated >= localUpdated) {
      return conflict.cloud;
    }

    // If local is newer (rare, due to clock skew), still prefer cloud for consistency
    return conflict.cloud;
  },

  async resolveAndStore(table: string, cloudRecord: Record<string, unknown>): Promise<void> {
    const localRecord = await coreDrive.get(table, cloudRecord.id as string) as Record<string, unknown> | undefined;

    if (!localRecord) {
      // No local copy — just store cloud version
      await coreDrive.put(table, cloudRecord);
      return;
    }

    const winner = this.resolve({
      local: localRecord,
      cloud: cloudRecord,
      table,
    });

    await coreDrive.put(table, winner);
  },
};
