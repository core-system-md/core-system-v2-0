export type SlaStatus = 'green' | 'yellow' | 'red';
export interface SlaThresholds { greenMaxMinutes: number; yellowMaxMinutes: number; redMinMinutes: number; }
export const DEFAULT_SLA_THRESHOLDS: SlaThresholds = { greenMaxMinutes: 14, yellowMaxMinutes: 24, redMinMinutes: 25, } as const;
export function computeSlaStatus(waitMinutes: number): SlaStatus { if (waitMinutes < 0) return 'green'; if (waitMinutes <= DEFAULT_SLA_THRESHOLDS.greenMaxMinutes) return 'green'; if (waitMinutes <= DEFAULT_SLA_THRESHOLDS.yellowMaxMinutes) return 'yellow'; return 'red'; }
export function getSlaColorToken(status: SlaStatus): string { const colors: Record<SlaStatus, string> = { green: '#22c55e', yellow: '#f59e0b', red: '#ef4444', }; return colors[status]; }
export function getSlaLabel(status: SlaStatus): string { const labels: Record<SlaStatus, string> = { green: 'On Time', yellow: 'Warning', red: 'Breach', }; return labels[status]; }
