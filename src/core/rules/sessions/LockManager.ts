/**
 * @file LockManager.ts
 * @description Live card lock governance -- Constitution §5.4
 */
export interface SessionLock {
  sessionId: string;
  holderId: string;
  holderName: string;
  acquiredAt: Date;
}

const locks = new Map<string, SessionLock>();
const SOFT_WARN_MINUTES = 5;
const HARD_RELEASE_MINUTES = 10;

export function acquireLock(
  sessionId: string,
  holderId: string,
  holderName: string
): { success: boolean; reason?: string } {
  const existing = locks.get(sessionId);
  if (existing && existing.holderId !== holderId) {
    return {
      success: false,
      reason: `Locked by ${existing.holderName} since ${existing.acquiredAt.toISOString()}`,
    };
  }
  locks.set(sessionId, { sessionId, holderId, holderName, acquiredAt: new Date() });
  return { success: true };
}

export function releaseLock(sessionId: string, holderId: string): boolean {
  const existing = locks.get(sessionId);
  if (!existing) return false;
  if (existing.holderId !== holderId) return false;
  locks.delete(sessionId);
  return true;
}

export function getLock(sessionId: string): SessionLock | undefined {
  return locks.get(sessionId);
}

export function isLocked(sessionId: string): boolean {
  return locks.has(sessionId);
}

export function getLockAgeMinutes(sessionId: string): number | null {
  const lock = locks.get(sessionId);
  if (!lock) return null;
  return (Date.now() - lock.acquiredAt.getTime()) / (1000 * 60);
}

export function shouldWarnAbandonment(sessionId: string): boolean {
  const age = getLockAgeMinutes(sessionId);
  if (age === null) return false;
  return age >= SOFT_WARN_MINUTES && age < HARD_RELEASE_MINUTES;
}

export function shouldAutoRelease(sessionId: string): boolean {
  const age = getLockAgeMinutes(sessionId);
  if (age === null) return false;
  return age >= HARD_RELEASE_MINUTES;
}

export function forceRelease(sessionId: string): boolean {
  return locks.delete(sessionId);
}

export function getAllLocks(): SessionLock[] {
  return Array.from(locks.values());
}
