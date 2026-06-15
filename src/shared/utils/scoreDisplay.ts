// src/shared/utils/scoreDisplay.ts
// Backend (0–1000) to Display (0–100.0) conversion

/**
 * Convert backend precision score to display value
 * backend 1000 → display 100.0
 * backend 750 → display 75.0
 */
export function backendToDisplay(backend: number): number {
  const clamped = Math.max(0, Math.min(1000, backend));
  return Math.round((clamped / 10) * 10) / 10; // 1 decimal place
}

/**
 * Convert display value back to backend (for form inputs)
 */
export function displayToBackend(display: number): number {
  const clamped = Math.max(0, Math.min(100, display));
  return Math.round(clamped * 10);
}

/**
 * Get color class for SLA radar / score badges
 */
export function getScoreColorClass(display: number): string {
  if (display >= 90) return 'text-emerald-600 bg-emerald-50'; // hot_lead
  if (display >= 80) return 'text-green-600 bg-green-50';     // qualified
  if (display >= 60) return 'text-blue-600 bg-blue-50';      // high_priority
  if (display >= 40) return 'text-amber-600 bg-amber-50';    // medium_priority
  return 'text-slate-500 bg-slate-50';                       // low_priority
}

/**
 * Get Arabic label for patient class
 */
export function getPatientClassLabel(classType: string): string {
  const labels: Record<string, string> = {
    low_priority: 'أولوية منخفضة',
    medium_priority: 'أولوية متوسطة',
    high_priority: 'أولوية عالية',
    qualified: 'مؤهل',
    hot_lead: 'عميل ساخن',
  };
  return labels[classType] || classType;
}
