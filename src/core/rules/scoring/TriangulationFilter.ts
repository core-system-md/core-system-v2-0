/**
 * @file TriangulationFilter.ts
 * @description Integrity Filter 2 -- Constitution §4.1
 */
export interface TriangulationResult {
  verified: boolean; confidence: number; discrepancies: string[];
}

const CONFIDENCE_THRESHOLD = 70;

export function triangulateScore(
  sessionScore: number,
  surveyIndicators: { readinessLevel: number; opennessToProceed: number; followupImportance: number; },
  doctorParResult: string | null,
  historicalAvg: number
): TriangulationResult {
  const discrepancies: string[] = [];
  let confidence = 100;
  const expectedDri = surveyIndicators.readinessLevel * 200;
  if (Math.abs(sessionScore - expectedDri) > 300) { discrepancies.push('DRI mismatch'); confidence -= 20; }
  if (doctorParResult === 'rejection' && sessionScore > 600) { discrepancies.push('PAR rejection with high score'); confidence -= 30; }
  if (historicalAvg > 0 && Math.abs(sessionScore - historicalAvg) / historicalAvg > 0.5) { discrepancies.push('Historical deviation'); confidence -= 25; }
  return { verified: confidence >= CONFIDENCE_THRESHOLD, confidence: Math.max(0, confidence), discrepancies };
}

export function isTriangulationValid(result: TriangulationResult): boolean {
  return result.verified && result.discrepancies.length === 0;
}
