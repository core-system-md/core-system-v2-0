// src/shared/utils/currency.ts
// Currency conversion: INTEGER subunits ↔ human display
// CRITICAL: Never use FLOAT for money. Always INTEGER.

import type { CurrencyReference } from '../types/database';

/**
 * Convert INTEGER subunits to human-readable display string
 * Example: 10000 subunits + JOD (1000) → "10.000"
 * Example: 10000 subunits + SAR (100) → "100.00"
 */
export function subunitsToDisplay(
  subunits: number,
  currency: CurrencyReference
): string {
  const { subunit: divisor, decimal_places, symbol, code } = currency;
  
  const raw = subunits / divisor;
  const formatted = raw.toFixed(decimal_places);
  
  // RTL-aware for Arabic currencies
  const isArabic = ['JOD', 'SAR', 'EGP', 'AED', 'KWD', 'QAR', 'BHD', 'OMR', 'TND', 'LBP', 'IQD', 'MAD', 'YER', 'SYP', 'SDG'].includes(code);
  
  if (isArabic && symbol) {
    return `${formatted} ${symbol}`;
  }
  
  return `${symbol || code}${formatted}`;
}

/**
 * Convert human display input to INTEGER subunits
 * Example: "10.000" + JOD (1000) → 10000
 * Example: "100.50" + SAR (100) → 10050
 */
export function displayToSubunits(
  displayValue: string,
  currency: CurrencyReference
): number {
  const { subunit: multiplier } = currency;
  
  // Remove currency symbols and whitespace
  const clean = displayValue.replace(/[^\d.-]/g, '');
  const floatVal = parseFloat(clean);
  
  if (isNaN(floatVal)) {
    throw new Error(`Invalid currency value: ${displayValue}`);
  }
  
  return Math.round(floatVal * multiplier);
}

/**
 * Quick formatter for JOD (legacy fallback, not preferred)
 * Use subunitsToDisplay with full CurrencyReference instead
 */
export function filsToJod(fils: number): string {
  return (fils / 1000).toFixed(3);
}

/**
 * Calculate balance after payment
 * All inputs must be INTEGER subunits
 */
export function calculateBalance(
  totalSubunits: number,
  paidSubunits: number
): number {
  return Math.max(0, totalSubunits - paidSubunits);
}

/**
 * Verify triangulation: 80% minimum payment threshold
 */
export function isTriangulationMet(
  paidSubunits: number,
  totalSubunits: number,
  doctorConfirmed: boolean,
  receptionCollected: boolean
): boolean {
  return (
    doctorConfirmed &&
    receptionCollected &&
    paidSubunits >= Math.round(totalSubunits * 0.80)
  );
}
