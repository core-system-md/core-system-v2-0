// src/rules/sessions/index.ts
export { canAcquireLock, releaseLock, forceReleaseAbandoned } from './LockManager';
export { validateTransition, getTerminalStatuses, isTerminal } from './SessionLifecycle';
export type { LockAcquireResult, LockState } from './LockManager';
export type { TransitionGuard, TransitionRequest } from './SessionLifecycle';
