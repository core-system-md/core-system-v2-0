// ============================================================
// currency.ts — CORE SYSTEM v2.1
// Constitution §7: JOD (1 JOD = 1000 fils), NO FLOAT
// Purpose: Convert between display (JOD) and storage (fils)
// ============================================================

const SUBUNIT_PER_JOD = 1000;
const CURRENCY_SYMBOL = 'JOD';

/**
 * Convert fils (integer subunits) to display string
 * Example: 25500 → "25.500 JOD"
 */
export function subunitsToDisplay(subunits: number): string {
  const jod = subunits / SUBUNIT_PER_JOD;
  return `${jod.toFixed(3)} ${CURRENCY_SYMBOL}`;
}

/**
 * Convert display string to fils (integer subunits)
 * Example: "25.500" → 25500
 * SAFE: No floating point accumulation
 */
export function displayToSubunits(display: string | number): number {
  const num = typeof display === 'string' ? parseFloat(display.replace(/[^0-9.]/g, '')) : display;
  return Math.round(num * SUBUNIT_PER_JOD);
}

/**
 * Format subunits for input fields (3 decimal places)
 */
export function subunitsToInputValue(subunits: number): string {
  return (subunits / SUBUNIT_PER_JOD).toFixed(3);
}

/**
 * Add two monetary values in subunits (safe integer arithmetic)
 */
export function addSubunits(a: number, b: number): number {
  return a + b; // Integer addition is safe
}

/**
 * Subtract two monetary values in subunits
 */
export function subtractSubunits(a: number, b: number): number {
  return a - b;
}

/**
 * Multiply subunits by a factor (round to nearest fils)
 */
export function multiplySubunits(subunits: number, factor: number): number {
  return Math.round(subunits * factor);
}

/**
 * Calculate percentage of subunits (for discounts/tax)
 */
export function percentageOfSubunits(subunits: number, percent: number): number {
  return Math.round(subunits * (percent / 100));
}