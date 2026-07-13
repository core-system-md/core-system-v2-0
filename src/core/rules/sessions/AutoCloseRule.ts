/**
 * @file AutoCloseRule.ts
 * @description 60-minute auto-close logic -- Constitution §5.5
 */

export interface AutoCloseState {
    sessionId: string;
    visitClosedAt: Date | null;
    autoCloseAt: Date | null;
    isTriggered: boolean;
}

const AUTO_CLOSE_MINUTES = 60;

export function initializeAutoClose(sessionId: string, visitClosedAt: Date): AutoCloseState {
    const autoCloseAt = new Date(visitClosedAt.getTime() + AUTO_CLOSE_MINUTES * 60 * 1000);
    return {
        sessionId,
        visitClosedAt,
        autoCloseAt,
        isTriggered: false,
    };
}

export function shouldAutoClose(state: AutoCloseState): boolean {
    if (!state.autoCloseAt || state.isTriggered) return false;
    return Date.now() > state.autoCloseAt.getTime();
}

export function getMinutesUntilAutoClose(state: AutoCloseState): number | null {
    if (!state.autoCloseAt || state.isTriggered) return null;
    const remaining = state.autoCloseAt.getTime() - Date.now();
    return Math.max(0, Math.ceil(remaining / (1000 * 60)));
}

export function triggerAutoClose(state: AutoCloseState): AutoCloseState {
    return { ...state, isTriggered: true };
}

export function cancelAutoClose(state: AutoCloseState): AutoCloseState {
    return { ...state, autoCloseAt: null, isTriggered: false };
}