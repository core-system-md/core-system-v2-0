// src/rules/sla/SlaThresholds.ts
// SLA thresholds: <15 safe | 15-24 warn | >=25 breach
// Matches core_rules_config: sla_wait_times

export interface SlaThresholdConfig {
  greenMaxMinutes: number;
  yellowMaxMinutes: number;
  redMinMinutes: number;
}

export const DEFAULT_SLA_THRESHOLDS: SlaThresholdConfig = {
  greenMaxMinutes: 14,
  yellowMaxMinutes: 24,
  redMinMinutes: 25,
};

export type SlaStatus = 'green' | 'yellow' | 'red';

export function computeSlaStatus(waitMinutes: number): SlaStatus {
  if (waitMinutes <= DEFAULT_SLA_THRESHOLDS.greenMaxMinutes) return 'green';
  if (waitMinutes <= DEFAULT_SLA_THRESHOLDS.yellowMaxMinutes) return 'yellow';
  return 'red';
}

export function getSlaColorToken(status: SlaStatus): string {
  const tokens: Record<SlaStatus, string> = {
    green: 'emerald',
    yellow: 'amber',
    red: 'rose',
  };
  return tokens[status];
}

export function getSlaLabel(status: SlaStatus): string {
  const labels: Record<SlaStatus, string> = {
    green: 'ضمن المعدل',
    yellow: 'تحذير',
    red: 'تجاوز SLA',
  };
  return labels[status];
}
