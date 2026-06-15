// src/rules/sessions/LockManager.ts
// Acquire/release live card locks + abandonment detection

export type LockAcquireResult = 'acquired' | 'already_held' | 'abandoned' | 'invalid_session';

export interface LockState {
  holderId: string | null;
  holderName: string | null;
  timestamp: string | null;
  isAbandoned: boolean;
}

export function canAcquireLock(
  currentHolderId: string | null,
  currentTimestamp: string | null,
  requesterId: string,
  abandonmentTimeoutMinutes: number = 10
): LockAcquireResult {
  if (!currentHolderId) return 'acquired';

  if (currentHolderId === requesterId) return 'already_held';

  if (currentTimestamp) {
    const heldSince = new Date(currentTimestamp);
    const now = new Date();
    const heldMinutes = (now.getTime() - heldSince.getTime()) / (1000 * 60);

    if (heldMinutes > abandonmentTimeoutMinutes) {
      return 'acquired'; // Previous lock abandoned
    }
  }

  return 'already_held';
}

export function releaseLock(
  currentHolderId: string | null,
  requesterId: string
): 'released' | 'not_holder' | 'no_lock' {
  if (!currentHolderId) return 'no_lock';
  if (currentHolderId !== requesterId) return 'not_holder';
  return 'released';
}

export function forceReleaseAbandoned(
  currentHolderId: string | null,
  currentTimestamp: string | null,
  abandonmentTimeoutMinutes: number = 10
): boolean {
  if (!currentHolderId || !currentTimestamp) return false;

  const heldSince = new Date(currentTimestamp);
  const now = new Date();
  const heldMinutes = (now.getTime() - heldSince.getTime()) / (1000 * 60);

  return heldMinutes > abandonmentTimeoutMinutes;
}
