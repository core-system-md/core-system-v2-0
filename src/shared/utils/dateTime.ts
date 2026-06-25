// ============================================================
// dateTime.ts — CORE SYSTEM v2.1
// Constitution §7: Asia/Amman, YYYY-MM-DD, 24-hour HH:mm
// Purpose: All timezone-aware date formatting
// ============================================================

const TIMEZONE = 'Asia/Amman';
const DATE_FORMAT = 'YYYY-MM-DD';
const TIME_FORMAT = 'HH:mm';

/**
 * Format date to YYYY-MM-DD (Amman timezone)
 */
export function formatDate(date: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-JO', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).split('/').reverse().join('-');
}

/**
 * Format time to HH:mm (24-hour, Amman timezone)
 */
export function formatTime(date: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-JO', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format date + time together
 */
export function formatDateTime(date: Date | string | null): string {
  if (!date) return '';
  return `${formatDate(date)} ${formatTime(date)}`;
}

/**
 * Parse YYYY-MM-DD string to Date object (Amman timezone)
 */
export function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00+03:00'); // +03:00 for Amman
}

/**
 * Get current timestamp in Amman timezone
 */
export function nowAmman(): Date {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
}

/**
 * Calculate difference in minutes between two dates
 */
export function diffMinutes(start: Date | string, end: Date | string): number {
  const s = typeof start === 'string' ? new Date(start) : start;
  const e = typeof end === 'string' ? new Date(end) : end;
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60));
}

/**
 * Add minutes to a date
 */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

/**
 * Check if date is today (Amman timezone)
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = nowAmman();
  return formatDate(d) === formatDate(today);
}

/**
 * Format for display in Arabic locale
 */
export function formatDateArabic(date: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ar-JO', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}