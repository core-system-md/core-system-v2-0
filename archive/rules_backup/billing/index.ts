// src/rules/billing/index.ts
export { isFeatureAllowed, getAllowedFeatures, getBlockedFeatures } from './TierGates';
export { getDeviceLimit, canRegisterDevice, getRemainingDeviceSlots, isDeviceLimitReached } from './DeviceLimiter';
export { calculateTrialCountdown, isTrialExpired, isInGracePeriod, getTrialUrgencyLabel } from './TrialExpiry';
export type { FeatureKey } from './TierGates';
