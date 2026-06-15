// src/shared/utils/dateTime.ts
// All timestamps formatted for Asia/Amman (UTC+3, DST-aware)

export const DEFAULT_TIMEZONE = 'Asia/Amman';

/**
 * Format ISO timestamp to Amman local display
 */
export function formatToAmman(
  isoTimestamp: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof isoTimestamp === 'string' ? new Date(isoTimestamp) : isoTimestamp;
  
  return d.toLocaleString('ar-JO', {
    timeZone: DEFAULT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options,
  });
}

/**
 * Format to compact date only (for invoices, reports)
 */
export function formatDateAmman(isoTimestamp: string | Date): string {
  return formatToAmman(isoTimestamp, {
    hour: undefined,
    minute: undefined,
  });
}

/**
 * Calculate SLA wait time in minutes from check-in to now
 */
export function calculateWaitMinutes(checkInAt: string): number {
  const checkIn = new Date(checkInAt);
  const now = new Date();
  return Math.floor((now.getTime() - checkIn.getTime()) / (1000 * 60));
}

/**
 * Check if a timestamp is within business hours (8AM–8PM Amman)
 */
export function isWithinBusinessHours(isoTimestamp: string): boolean {
  const d = new Date(isoTimestamp);
  const hour = parseInt(d.toLocaleString('en-US', { timeZone: DEFAULT_TIMEZONE, hour: 'numeric', hour12: false }));
  return hour >= 8 && hour < 20;
}

/**
 * Add minutes to a timestamp, return ISO string
 */
export function addMinutes(isoTimestamp: string, minutes: number): string {
  const d = new Date(isoTimestamp);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

/**
 * Format duration for display: "45 دقيقة"
 */
export function formatDurationMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} دقيقة`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} ساعة ${m} دقيقة` : `${h} ساعة`;
}
