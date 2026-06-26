/**
 * CORE SYSTEM v2.1 — currency.ts
 * CONSTITUTION §2.2: INTEGER fils only, NO FLOAT
 * 1 JOD = 1000 fils
 */

export const CURRENCY = 'JOD' as const;
export const SUBUNIT_RATIO = 1000;

/**
 * Convert subunits (INTEGER) to display format
 * Example: 25500 fils → "25.500 JOD"
 */
export function subunitsToDisplay(subunits: number | null): string {
  if (subunits === null || subunits === undefined) return '0.000 JOD';
  const integerSubunits = Math.round(subunits);
  const jod = (integerSubunits / SUBUNIT_RATIO).toFixed(3);
  return `${jod} ${CURRENCY}`;
}

/**
 * Convert display string to subunits (INTEGER)
 * Example: "25.500" → 25500
 */
export function displayToSubunits(displayAmount: string | number): number {
  const numericValue = typeof displayAmount === 'string'
    ? parseFloat(displayAmount.replace(/[^0-9.]/g, ''))
    : displayAmount;
  if (isNaN(numericValue)) return 0;
  return Math.round(numericValue * SUBUNIT_RATIO);
}

/**
 * Add two amounts in subunits (INTEGER arithmetic only)
 */
export function addSubunits(a: number, b: number): number {
  return Math.round(a) + Math.round(b);
}

/**
 * Subtract two amounts in subunits (INTEGER arithmetic only)
 */
export function subtractSubunits(a: number, b: number): number {
  return Math.round(a) - Math.round(b);
}

/**
 * Calculate percentage of amount in subunits
 * Used for: discount, tax, etc.
 * Example: 10000 fils, 16% → 1600 fils
 */
export function calculateTaxSubunits(amountSubunits: number, percentage: number): number {
  return Math.round((Math.round(amountSubunits) * percentage) / 100);
}

/**
 * Calculate discount in subunits
 * Alias for calculateTaxSubunits (same math)
 */
export function calculateDiscountSubunits(amountSubunits: number, percentage: number): number {
  return calculateTaxSubunits(amountSubunits, percentage);
}

/**
 * Format subunits for input fields (shows JOD value)
 */
export function subunitsToInputValue(subunits: number | null): string {
  if (subunits === null || subunits === undefined) return '0.000';
  return (Math.round(subunits) / SUBUNIT_RATIO).toFixed(3);
}
