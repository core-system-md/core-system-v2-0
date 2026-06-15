// src/rules/billing/TierGates.ts
// Feature access by subscription tier — gates what each tenant can use

import type { SubscriptionTier } from '../../shared/types/database';

export type FeatureKey =
  | 'ai_scheduling'
  | 'advanced_analytics'
  | 'multi_branch'
  | 'whatsapp_automation'
  | 'ghost_tracker'
  | 'ltv_scoring'
  | 'audit_trail'
  | 'telehealth_integration'
  | 'inventory_module'
  | 'patient_self_service';

const TIER_FEATURE_MAP: Record<SubscriptionTier, FeatureKey[]> = {
  trial: ['patient_self_service', 'whatsapp_automation'],
  essential: ['patient_self_service', 'whatsapp_automation', 'inventory_module'],
  professional: [
    'patient_self_service',
    'whatsapp_automation',
    'inventory_module',
    'advanced_analytics',
    'ghost_tracker',
    'ltv_scoring',
    'audit_trail',
  ],
  enterprise: [
    'patient_self_service',
    'whatsapp_automation',
    'inventory_module',
    'advanced_analytics',
    'ghost_tracker',
    'ltv_scoring',
    'audit_trail',
    'ai_scheduling',
    'multi_branch',
    'telehealth_integration',
  ],
  suspended: [],
};

export function isFeatureAllowed(tier: SubscriptionTier | 'super_admin', feature: FeatureKey): boolean {
  if (tier === 'super_admin') return true;
  const allowed = TIER_FEATURE_MAP[tier as SubscriptionTier] || [];
  return allowed.includes(feature);
}

export function getAllowedFeatures(tier: SubscriptionTier | 'super_admin'): FeatureKey[] {
  if (tier === 'super_admin') return Object.keys(TIER_FEATURE_MAP) as FeatureKey[];
  return TIER_FEATURE_MAP[tier as SubscriptionTier] || [];
}

export function getBlockedFeatures(tier: SubscriptionTier): FeatureKey[] {
  const all: FeatureKey[] = [
    'ai_scheduling', 'advanced_analytics', 'multi_branch', 'whatsapp_automation',
    'ghost_tracker', 'ltv_scoring', 'audit_trail', 'telehealth_integration',
    'inventory_module', 'patient_self_service',
  ];
  const allowed = getAllowedFeatures(tier);
  return all.filter((f) => !allowed.includes(f));
}
