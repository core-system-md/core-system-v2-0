// src/rules/scoring/PatientClassifier.ts
// Maps display score (0-100) to patient classification tiers

import type { PatientClass } from '../../shared/types/scoring';

export function classifyPatient(displayScore: number): PatientClass {
  const clamped = Math.max(0, Math.min(100, displayScore));
  
  if (clamped >= 90) return 'hot_lead';
  if (clamped >= 80) return 'qualified';
  if (clamped >= 60) return 'high_priority';
  if (clamped >= 40) return 'medium_priority';
  return 'low_priority';
}

/**
 * Get Arabic label for UI display
 */
export function getClassLabel(classType: PatientClass): string {
  const labels: Record<PatientClass, string> = {
    hot_lead: 'عميل ساخن',
    qualified: 'مؤهل',
    high_priority: 'أولوية عالية',
    medium_priority: 'أولوية متوسطة',
    low_priority: 'أولوية منخفضة',
  };
  return labels[classType];
}

/**
 * Get color token for Tailwind classes
 */
export function getClassColor(classType: PatientClass): string {
  const colors: Record<PatientClass, string> = {
    hot_lead: 'emerald',
    qualified: 'green',
    high_priority: 'blue',
    medium_priority: 'amber',
    low_priority: 'slate',
  };
  return colors[classType];
}
