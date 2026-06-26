/**
 * CORE SYSTEM v2.1 — scoreDisplay.ts
 * CONSTITUTION §2.3: Backend 0-1000 → Display 0.0-100.0
 * DISPLAY = ROUND(BACKEND / 10.0, 1)
 */

export function backendToDisplay(backendScore: number | null): number | null {
  if (backendScore === null || backendScore === undefined) return null;
  const clamped = Math.max(0, Math.min(1000, backendScore));
  return Math.round((clamped / 10) * 10) / 10;
}

export function displayToBackend(displayScore: number | null): number | null {
  if (displayScore === null || displayScore === undefined) return null;
  const backend = Math.round(displayScore * 10);
  return Math.max(0, Math.min(1000, backend));
}

export type PatientClass = 'hot_lead' | 'qualified' | 'high_priority' | 'medium_priority' | 'low_priority';

export function classifyPatient(displayScore: number | null): PatientClass {
  if (displayScore === null) return 'low_priority';
  if (displayScore >= 90) return 'hot_lead';
  if (displayScore >= 80) return 'qualified';
  if (displayScore >= 60) return 'high_priority';
  if (displayScore >= 40) return 'medium_priority';
  return 'low_priority';
}

export function getClassLabel(className: PatientClass): string {
  const labels: Record<PatientClass, string> = {
    hot_lead: 'فرصة ساخنة',
    qualified: 'مؤهل',
    high_priority: 'أولوية عالية',
    medium_priority: 'أولوية متوسطة',
    low_priority: 'أولوية منخفضة'
  };
  return labels[className] || className;
}

export function getClassColors(className: PatientClass): { text: string; bg: string } {
  const colors: Record<PatientClass, { text: string; bg: string }> = {
    hot_lead: { text: 'text-red-400', bg: 'bg-red-500/20' },
    qualified: { text: 'text-orange-400', bg: 'bg-orange-500/20' },
    high_priority: { text: 'text-yellow-400', bg: 'bg-yellow-500/20' },
    medium_priority: { text: 'text-blue-400', bg: 'bg-blue-500/20' },
    low_priority: { text: 'text-gray-400', bg: 'bg-gray-500/20' }
  };
  return colors[className] || colors.low_priority;
}
