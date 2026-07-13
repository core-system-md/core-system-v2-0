/**
 * @file BufferWindowRule.ts
 * @description 5-minute post-exam buffer window -- Constitution §5.2
 */
export interface BufferWindowState {
  sessionId: string;
  sessionEndedAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

const BUFFER_MINUTES = 5;

export function createBufferWindow(sessionId: string, sessionEndedAt: Date): BufferWindowState {
  const expiresAt = new Date(sessionEndedAt.getTime() + BUFFER_MINUTES * 60 * 1000);
  return {
    sessionId,
    sessionEndedAt,
    expiresAt,
    isActive: true,
  };
}

export function isBufferWindowExpired(state: BufferWindowState): boolean {
  return Date.now() > state.expiresAt.getTime();
}

export function getRemainingSeconds(state: BufferWindowState): number {
  const remaining = state.expiresAt.getTime() - Date.now();
  return Math.max(0, Math.floor(remaining / 1000));
}

export function canModifyDuringBuffer(state: BufferWindowState): boolean {
  return !isBufferWindowExpired(state);
}

export function closeBufferWindow(state: BufferWindowState): BufferWindowState {
  return { ...state, isActive: false };
}
