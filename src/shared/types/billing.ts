// src/shared/types/billing.ts
// Billing, tiers, and subscription types

export type SubscriptionTier = 'trial' | 'essential' | 'professional' | 'enterprise' | 'suspended';

export interface TierLimits {
  maxUsers: number;
  maxPatients: number;
  maxProceduresPerMonth: number;
  maxDevices: number;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  trial: { maxUsers: 3, maxPatients: 50, maxProceduresPerMonth: 100, maxDevices: 2 },
  essential: { maxUsers: 5, maxPatients: 100, maxProceduresPerMonth: 500, maxDevices: 2 },
  professional: { maxUsers: 15, maxPatients: 500, maxProceduresPerMonth: 2000, maxDevices: 5 },
  enterprise: { maxUsers: 999, maxPatients: 9999, maxProceduresPerMonth: 99999, maxDevices: 999 },
  suspended: { maxUsers: 0, maxPatients: 0, maxProceduresPerMonth: 0, maxDevices: 0 },
};

export type BillingEventType = 
  | 'trial_started' | 'trial_expired' 
  | 'subscription_created' | 'subscription_upgraded' | 'subscription_downgraded' | 'subscription_cancelled'
  | 'payment_succeeded' | 'payment_failed' 
  | 'manual_activation' | 'tier_override_by_admin' | 'feature_flag_toggled';

export interface BillingEventInput {
  tenantId: string;
  eventType: BillingEventType;
  previousTier?: SubscriptionTier;
  newTier?: SubscriptionTier;
  amountSubunits?: number;
  stripeEventId?: string;
  isManual?: boolean;
  activatedBy?: string;
  activationNotes?: string;
}

export interface TrialCountdown {
  daysRemaining: number;
  hoursRemaining: number;
  isExpired: boolean;
  gracePeriodActive: boolean;
}
