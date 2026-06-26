/**
 * CORE SYSTEM v2.1 — currency.ts
 * CONSTITUTION §2.2: INTEGER fils only, NO FLOAT
 * 1 JOD = 1000 fils
 */

export const CURRENCY = 'JOD' as const;
export const SUBUNIT_RATIO = 1000;

export function subunitsToDisplay(subunits: number | null): string {
  if (subunits === null || subunits === undefined) return '0.000 JOD';
  const integerSubunits = Math.round(subunits);
  const jod = (integerSubunits / SUBUNIT_RATIO).toFixed(3);
  return `${jod} ${CURRENCY}`;
}

export function displayToSubunits(displayAmount: string | number): number {
  const numericValue = typeof displayAmount === 'string'
    ? parseFloat(displayAmount.replace(/[^0-9.]/g, ''))
    : displayAmount;
  if (isNaN(numericValue)) return 0;
  return Math.round(numericValue * SUBUNIT_RATIO);
}

export function addSubunits(a: number, b: number): number {
  return Math.round(a) + Math.round(b);
}

export function subtractSubunits(a: number, b: number): number {
  return Math.round(a) - Math.round(b);
}
