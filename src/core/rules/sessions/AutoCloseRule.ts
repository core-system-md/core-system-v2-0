/**
 * @file AutoCloseRule.ts
 * @description Automatic session closure rules based on inactivity
 * @constitution §5.5 - Sessions auto-close after defined inactivity periods
 */

export interface AutoCloseConfig {
  idleTimeoutMinutes: number;
  warningBeforeMinutes: number;
  gracePeriodMinutes: number;
}

const AUTO_CLOSE_CONFIGS: Record<string, AutoCloseConfig> = {
  'checked_in': { idleTimeoutMinutes: 120, warningBeforeMinutes: 15, gracePeriodMinutes: 10 },
  'in_progress': { idleTimeoutMinutes: 60, warningBeforeMinutes: 10, gracePeriodMinutes: 5 },
  'waiting_lab': { idleTimeoutMinutes: 240, warningBeforeMinutes: 30, gracePeriodMinutes: 15 },
  'waiting_payment': { idleTimeoutMinutes: 30, warningBeforeMinutes: 5, gracePeriodMinutes: 5 },
  'default': { idleTimeoutMinutes: 90, warningBeforeMinutes: 10, gracePeriodMinutes: 5 },
};

export interface SessionTimer {
  sessionId: string;
  lastActivity: Date;
  status: string;
  warningShown: boolean;
}

export const AutoCloseRule = {
  getConfig(status: string): AutoCloseConfig {
    return AUTO_CLOSE_CONFIGS[status] ?? AUTO_CLOSE_CONFIGS['default'] ?? { idleTimeoutMinutes: 90, warningBeforeMinutes: 10, gracePeriodMinutes: 5 };
  },

  shouldShowWarning(timer: SessionTimer): boolean {
    const config = this.getConfig(timer.status);
    const elapsed = Date.now() - timer.lastActivity.getTime();
    const warningThreshold = (config.idleTimeoutMinutes - config.warningBeforeMinutes) * 60_000;
    return elapsed >= warningThreshold && !timer.warningShown;
  },

  shouldAutoClose(timer: SessionTimer): boolean {
    const config = this.getConfig(timer.status);
    const elapsed = Date.now() - timer.lastActivity.getTime();
    return elapsed >= config.idleTimeoutMinutes * 60_000;
  },

  getRemainingMinutes(timer: SessionTimer): number {
    const config = this.getConfig(timer.status);
    const elapsed = Date.now() - timer.lastActivity.getTime();
    const remaining = config.idleTimeoutMinutes * 60_000 - elapsed;
    return Math.max(0, Math.ceil(remaining / 60_000));
  },

  getMinutesUntilWarning(timer: SessionTimer): number {
    const config = this.getConfig(timer.status);
    const elapsed = Date.now() - timer.lastActivity.getTime();
    const warningAt = (config.idleTimeoutMinutes - config.warningBeforeMinutes) * 60_000;
    const remaining = warningAt - elapsed;
    return Math.max(0, Math.ceil(remaining / 60_000));
  },

  getCloseReason(status: string): string {
    const reasons: Record<string, string> = {
      'checked_in': 'Session auto-closed: patient checked in but never seen after 2 hours',
      'in_progress': 'Session auto-closed: procedure inactive for 1 hour',
      'waiting_lab': 'Session auto-closed: lab results pending for 4 hours',
      'waiting_payment': 'Session auto-closed: payment pending for 30 minutes',
      'default': 'Session auto-closed due to inactivity',
    };
    return reasons[status] ?? reasons['default'] ?? 'Session auto-closed due to inactivity';
  },
};
