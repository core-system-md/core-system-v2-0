// src/rules/billing/TrialExpiry.ts
// 14-day trial countdown enforcement + grace period logic

import type { TrialCountdown } from '../../shared/types/billing';

const TRIAL_DURATION_DAYS = 14;
const GRACE_PERIOD_HOURS = 24;

export function calculateTrialCountdown(trialStartedAt: string): TrialCountdown {
  const start = new Date(trialStartedAt);
  const now = new Date();
  const elapsedMs = now.getTime() - start.getTime();

  const totalDurationMs = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;
  const remainingMs = totalDurationMs - elapsedMs;

  const daysRemaining = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  const isExpired = remainingMs <= 0;
  const gracePeriodActive = isExpired && Math.abs(remainingMs) < (GRACE_PERIOD_HOURS * 60 * 60 * 1000);

  return {
    daysRemaining: Math.max(0, daysRemaining),
    hoursRemaining: Math.max(0, hoursRemaining),
    isExpired,
    gracePeriodActive,
  };
}

export function isTrialExpired(trialStartedAt: string): boolean {
  return calculateTrialCountdown(trialStartedAt).isExpired;
}

export function isInGracePeriod(trialStartedAt: string): boolean {
  return calculateTrialCountdown(trialStartedAt).gracePeriodActive;
}

export function getTrialUrgencyLabel(countdown: TrialCountdown): string {
  if (countdown.isExpired) return 'منتهي';
  if (countdown.daysRemaining <= 1) return 'يوم أخير';
  if (countdown.daysRemaining <= 3) return 'قريب الانتهاء';
  if (countdown.daysRemaining <= 7) return 'نصف المدة';
  return 'فترة تجريبية';
}
