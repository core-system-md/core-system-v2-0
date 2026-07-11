/**
 * @file LockManager.ts
 * @description Session locking mechanism to prevent concurrent modifications
 * @constitution §5.4 - No two staff may modify the same session simultaneously
 */

import { eventBus } from '../../events/EventBus';

export interface SessionLock {
  sessionId: string;
  lockedBy: string;
  lockedAt: Date;
  expiresAt: Date;
  reason: 'editing' | 'billing' | 'closing';
}

const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const locks = new Map<string, SessionLock>();

export const LockManager = {
  acquire(sessionId: string, userId: string, reason: SessionLock['reason']): boolean {
    const existing = locks.get(sessionId);
    
    if (existing && existing.expiresAt > new Date()) {
      if (existing.lockedBy !== userId) {
        eventBus.emit('session:lock:denied', { sessionId, lockedBy: existing.lockedBy });
        return false;
      }
      existing.expiresAt = new Date(Date.now() + LOCK_DURATION_MS);
      return true;
    }
    
    const lock: SessionLock = {
      sessionId,
      lockedBy: userId,
      lockedAt: new Date(),
      expiresAt: new Date(Date.now() + LOCK_DURATION_MS),
      reason,
    };
    
    locks.set(sessionId, lock);
    eventBus.emit('session:lock:acquired', { sessionId, userId, reason });
    return true;
  },

  release(sessionId: string, userId: string): boolean {
    const existing = locks.get(sessionId);
    if (!existing) return false;
    
    if (existing.lockedBy !== userId) {
      eventBus.emit('session:lock:unauthorized_release', { sessionId, attemptedBy: userId });
      return false;
    }
    
    locks.delete(sessionId);
    eventBus.emit('session:lock:released', { sessionId, userId });
    return true;
  },

  isLockedByOther(sessionId: string, userId: string): boolean {
    const lock = locks.get(sessionId);
    if (!lock) return false;
    if (lock.expiresAt <= new Date()) {
      locks.delete(sessionId);
      return false;
    }
    return lock.lockedBy !== userId;
  },

  getLockOwner(sessionId: string): string | null {
    const lock = locks.get(sessionId);
    if (!lock || lock.expiresAt <= new Date()) return null;
    return lock.lockedBy;
  },

  forceRelease(sessionId: string): void {
    locks.delete(sessionId);
    eventBus.emit('session:lock:force_released', { sessionId });
  },

  cleanup(): number {
    let count = 0;
    const now = new Date();
    for (const [id, lock] of locks) {
      if (lock.expiresAt <= now) {
        locks.delete(id);
        count++;
      }
    }
    return count;
  },
};

setInterval(() => LockManager.cleanup(), 60_000);
