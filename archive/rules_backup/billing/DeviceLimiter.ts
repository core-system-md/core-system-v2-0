// src/rules/billing/DeviceLimiter.ts
// Enforce max_devices per tenant based on subscription tier

import type { SubscriptionTier } from '../../shared/types/database';

const DEVICE_LIMITS: Record<SubscriptionTier, number> = {
  trial: 2,
  essential: 2,
  professional: 5,
  enterprise: 999,
  suspended: 0,
};

export function getDeviceLimit(tier: SubscriptionTier): number {
  return DEVICE_LIMITS[tier] ?? 2;
}

export function canRegisterDevice(
  tier: SubscriptionTier,
  currentDeviceCount: number
): boolean {
  const limit = getDeviceLimit(tier);
  return currentDeviceCount < limit;
}

export function getRemainingDeviceSlots(
  tier: SubscriptionTier,
  currentDeviceCount: number
): number {
  const limit = getDeviceLimit(tier);
  return Math.max(0, limit - currentDeviceCount);
}

export function isDeviceLimitReached(
  tier: SubscriptionTier,
  currentDeviceCount: number
): boolean {
  return !canRegisterDevice(tier, currentDeviceCount);
}
