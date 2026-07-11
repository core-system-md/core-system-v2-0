/**
 * @file currency.ts
 * @description Currency utilities — Constitution §2.2, §7
 * @rules ALL monetary values in fils (INTEGER), 1 JOD = 1000 fils, NO FLOAT
 */

// ============================================
// CONSTANTS — DO NOT MODIFY
// ============================================
export const JOD_SUBUNIT = 1000; // 1 JOD = 1000 fils
export const CURRENCY_CODE = 'JOD';
export const TIMEZONE = 'Asia/Amman';

// ============================================
// CONVERSION FUNCTIONS
// ============================================

/**
 * Convert display JOD (e.g., 25.500) to fils subunits (25500)
 * @param displayAmount JOD with decimals
 * @returns Integer fils
 */
export function displayToSubunits(displayAmount: number): number {
  if (typeof displayAmount !== 'number' || isNaN(displayAmount)) {
    throw new Error('[CURRENCY] Invalid display amount');
  }
  return Math.round(displayAmount * JOD_SUBUNIT);
}

/**
 * Convert fils subunits (25500) to display JOD string ("25.500 JOD")
 * @param subunits Integer fils
 * @returns Formatted JOD string
 */
export function subunitsToDisplay(subunits: number): string {
  if (!Number.isInteger(subunits)) {
    throw new Error('[CURRENCY] Subunits must be integer');
  }
  const jod = Math.floor(subunits / JOD_SUBUNIT);
  const fils = Math.abs(subunits % JOD_SUBUNIT);
  const filsStr = fils.toString().padStart(3, '0');
  const sign = subunits < 0 ? '-' : '';
  return `${sign}${jod}.${filsStr} ${CURRENCY_CODE}`;
}

/**
 * Convert fils to numeric JOD (for calculations)
 * @param subunits Integer fils
 * @returns Number (e.g., 25.5)
 */
export function subunitsToNumber(subunits: number): number {
  if (!Number.isInteger(subunits)) {
    throw new Error('[CURRENCY] Subunits must be integer');
  }
  return subunits / JOD_SUBUNIT;
}

/**
 * Add two amounts in fils (integer math)
 */
export function addFils(a: number, b: number): number {
  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    throw new Error('[CURRENCY] addFils requires integers');
  }
  return a + b;
}

/**
 * Subtract two amounts in fils (integer math)
 */
export function subtractFils(a: number, b: number): number {
  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    throw new Error('[CURRENCY] subtractFils requires integers');
  }
  return a - b;
}

/**
 * Calculate percentage of amount in fils
 */
export function percentageOfFils(subunits: number, percent: number): number {
  if (!Number.isInteger(subunits)) {
    throw new Error('[CURRENCY] percentageOfFils requires integer subunits');
  }
  return Math.round((subunits * percent) / 100);
}

// ============================================
// LEGACY ALIASES (backward compatibility)
// ============================================
/** @deprecated Use displayToSubunits() */
export const jodToFils = displayToSubunits;
/** @deprecated Use subunitsToDisplay() */
export const filsToJod = subunitsToDisplay;
