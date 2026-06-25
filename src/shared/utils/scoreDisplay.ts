// ============================================================
// scoreDisplay.ts — CORE SYSTEM v2.1
// Constitution §4.3: Backend 0-1000 → Display 0.0-100.0
// Purpose: Convert backend score to display format
// ============================================================

/**
 * Convert backend score (0-1000) to display score (0.0-100.0)
 */
export function backendToDisplay(backend: number): number {
  return Math.round((backend / 10.0) * 10) / 10; // Round to 1 decimal
}

/**
 * Convert display score (0.0-100.0) to backend score (0-1000)
 */
export function displayToBackend(display: number): number {
  return Math.round(display * 10);
}

/**
 * Get color class based on display score
 * Constitution SLA: Green <15min, Yellow 15-24min, Red >=25min
 * Score colors: Hot Lead (90+), Qualified (80+), High (60+), Medium (40+), Low (<40)
 */
export function getScoreColorClass(display: number): string {
  if (display >= 90) return 'text-red-500';      // hot_lead
  if (display >= 80) return 'text-orange-500';     // qualified
  if (display >= 60) return 'text-yellow-500';     // high_priority
  if (display >= 40) return 'text-blue-400';       // medium_priority
  return 'text-gray-400';                          // low_priority
}

/**
 * Get background color class based on display score
 */
export function getScoreBgClass(display: number): string {
  if (display >= 90) return 'bg-red-500/20 border-red-500/30';
  if (display >= 80) return 'bg-orange-500/20 border-orange-500/30';
  if (display >= 60) return 'bg-yellow-500/20 border-yellow-500/30';
  if (display >= 40) return 'bg-blue-500/20 border-blue-500/30';
  return 'bg-gray-500/20 border-gray-500/30';
}

/**
 * Get patient class label in Arabic
 */
export function getPatientClassLabel(display: number): string {
  if (display >= 90) return 'عميل ساخن';
  if (display >= 80) return 'مؤهل';
  if (display >= 60) return 'أولوية عالية';
  if (display >= 40) return 'أولوية متوسطة';
  return 'أولوية منخفضة';
}

/**
 * Format display score with Arabic label
 */
export function formatScoreDisplay(backend: number): {
  display: number;
  label: string;
  colorClass: string;
  bgClass: string;
} {
  const display = backendToDisplay(backend);
  return {
    display,
    label: getPatientClassLabel(display),
    colorClass: getScoreColorClass(display),
    bgClass: getScoreBgClass(display),
  };
}