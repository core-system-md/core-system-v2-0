/**
 * @file PatientClassifier.ts
 * @description Patient classification -- Constitution §4.2
 */
export type PatientClass = 'hot_lead' | 'qualified' | 'high_priority' | 'medium_priority' | 'low_priority';

export function classifyPatient(displayScore: number): PatientClass {
  if (displayScore >= 90.0) return 'hot_lead';
  if (displayScore >= 80.0) return 'qualified';
  if (displayScore >= 60.0) return 'high_priority';
  if (displayScore >= 40.0) return 'medium_priority';
  return 'low_priority';
}

export function getPatientClassLabel(c: PatientClass): string {
  const labels: Record<PatientClass, string> = {
    hot_lead: 'Hot Lead 🔥', qualified: 'Qualified ✅', high_priority: 'High Priority ⚡',
    medium_priority: 'Medium Priority 📋', low_priority: 'Low Priority 📝',
  };
  return labels[c] ?? 'Unknown';
}

export function getPatientClassColor(c: PatientClass): string {
  const colors: Record<PatientClass, string> = {
    hot_lead: '#ef4444', qualified: '#22c55e', high_priority: '#f59e0b',
    medium_priority: '#3b82f6', low_priority: '#6b7280',
  };
  return colors[c] ?? '#6b7280';
}
