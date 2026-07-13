/**
 * @file SamPatelProtocol.ts
 * @description Red breach escalation protocol -- Constitution Â§6.3
 */

export interface SamPatelAction {
    action: 'notify_reception' | 'notify_admin' | 'escalate_manager' | 'auto_reassign';
    priority: 'high' | 'critical';
    message: string;
    timestamp: Date;
}

const BREACH_ESCALATION_MINUTES = [25, 35, 45] as const;

export function evaluateSamPatelProtocol(
    waitMinutes: number,
    patientClass: string,
    isVip: boolean
): SamPatelAction | null {
    // Level 1: 25 minutes (initial breach)
    if (waitMinutes >= BREACH_ESCALATION_MINUTES[0] && waitMinutes < BREACH_ESCALATION_MINUTES[1]) {
        return {
            action: 'notify_reception',
            priority: 'high',
            message: `Patient waiting ${waitMinutes}min. Notify reception to expedite.`,
            timestamp: new Date(),
        };
    }

    // Level 2: 35 minutes
    if (waitMinutes >= BREACH_ESCALATION_MINUTES[1] && waitMinutes < BREACH_ESCALATION_MINUTES[2]) {
        return {
            action: 'notify_admin',
            priority: 'high',
            message: `Patient waiting ${waitMinutes}min. Alert clinic admin for intervention.`,
            timestamp: new Date(),
        };
    }

    // Level 3: 45+ minutes (critical)
    if (waitMinutes >= BREACH_ESCALATION_MINUTES[2]) {
        const action: SamPatelAction['action'] = isVip || patientClass === 'hot_lead'
            ? 'auto_reassign'
            : 'escalate_manager';
        return {
            action,
            priority: 'critical',
            message: `CRITICAL: Patient waiting ${waitMinutes}min. ${action === 'auto_reassign' ? 'Auto-reassign to next available doctor.' : 'Escalate to clinic manager immediately.'}`,
            timestamp: new Date(),
        };
    }

    return null;
}

export function shouldTriggerProtocol(waitMinutes: number): boolean {
    return waitMinutes >= BREACH_ESCALATION_MINUTES[0];
}

export function getEscalationLevel(waitMinutes: number): number {
    if (waitMinutes < BREACH_ESCALATION_MINUTES[0]) return 0;
    if (waitMinutes < BREACH_ESCALATION_MINUTES[1]) return 1;
    if (waitMinutes < BREACH_ESCALATION_MINUTES[2]) return 2;
    return 3;
}
