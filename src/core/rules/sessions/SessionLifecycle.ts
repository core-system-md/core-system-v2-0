// src/core/rules/sessions/SessionLifecycle.ts
// State Machine: waiting → checked_in → in_consultation → pending_close → completed

export type SessionStatus = 'waiting' | 'checked_in' | 'in_consultation' | 'pending_close' | 'auto_closed' | 'completed' | 'cancelled';

export const VALID_TRANSITIONS = [
  { from: 'waiting', to: 'checked_in', allowedRoles: ['receptionist', 'clinic_admin', 'super_admin'] },
  { from: 'checked_in', to: 'in_consultation', allowedRoles: ['doctor', 'clinic_admin', 'super_admin'], requiresInvoice: true },
  { from: 'in_consultation', to: 'pending_close', allowedRoles: ['doctor', 'clinic_admin', 'super_admin'] },
  { from: 'pending_close', to: 'completed', allowedRoles: ['receptionist', 'clinic_admin', 'super_admin'] },
  { from: 'waiting', to: 'cancelled', allowedRoles: ['receptionist', 'clinic_admin', 'super_admin'] },
];

export class SessionLifecycle {
  private currentStatus: SessionStatus = 'waiting';

  canTransition(to: SessionStatus, userRole: string, hasPaidInvoice: boolean = false) {
    const transition = VALID_TRANSITIONS.find(t => t.from === this.currentStatus && t.to === to);
    if (!transition) return { allowed: false, reason: `Invalid: ${this.currentStatus} → ${to}` };
    if (!transition.allowedRoles.includes(userRole)) return { allowed: false, reason: `Role ${userRole} denied` };
    if (transition.requiresInvoice && !hasPaidInvoice) return { allowed: false, reason: 'Fee required' };
    return { allowed: true };
  }

  transition(to: SessionStatus, userRole: string, hasPaidInvoice: boolean = false) {
    const check = this.canTransition(to, userRole, hasPaidInvoice);
    if (!check.allowed) return { success: false, newStatus: this.currentStatus, error: check.reason };
    this.currentStatus = to;
    return { success: true, newStatus: to };
  }

  getCurrentStatus() { return this.currentStatus; }
  shouldAutoClose(bufferExpiresAt: Date | null) { return this.currentStatus === 'pending_close' && !!bufferExpiresAt && new Date() > bufferExpiresAt; }
}

export const sessionLifecycle = new SessionLifecycle();
