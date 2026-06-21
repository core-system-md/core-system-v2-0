// src/core/rules/scoring/CoreScoreEngine.ts
// CORE Score Formula: APS×0.28 + DRI×0.24 + RVS×0.20 + URI×0.15 + TSI×0.13
// UPDATED: Calls score-calculator Edge Function (NO frontend calculation per Constitution)

import { supabase } from '../../../infrastructure/supabase/client';

export interface ScoreIndicators {
  APS: number;
  DRI: number;
  RVS: number;
  URI: number;
  TSI: number;
  PQS: number;
}

export interface CoreScoreResult {
  backend: number;
  display: number;
  patientClass: PatientClass;
  raw: number;
  penalty: number;
}

export type PatientClass = 
  | 'low_priority' 
  | 'medium_priority' 
  | 'high_priority' 
  | 'qualified' 
  | 'hot_lead';

export class CoreScoreEngine {
  static async calculate(indicators: ScoreIndicators): Promise<CoreScoreResult> {
    // Call score-calculator Edge Function (Constitution: NO frontend calculation)
    const { data, error } = await supabase.functions.invoke('score-calculator', {
      body: indicators
    });
    
    if (error) {
      console.error('[CoreScoreEngine] Edge Function error:', error);
      throw new Error('Score calculation failed');
    }
    
    return data as CoreScoreResult;
  }

  // Fallback: local calculation only if Edge Function unavailable (development)
  static calculateLocal(indicators: ScoreIndicators): CoreScoreResult {
    const raw = 
      indicators.APS * 0.28 +
      indicators.DRI * 0.24 +
      indicators.RVS * 0.20 +
      indicators.URI * 0.15 +
      indicators.TSI * 0.13;
    
    const penalty = indicators.PQS < 50 ? (50 - indicators.PQS) * 0.5 : 0;
    const backend = raw - penalty;
    const display = Math.round(backend * 100) / 100;
    
    let patientClass: PatientClass = 'low_priority';
    if (backend >= 80) patientClass = 'hot_lead';
    else if (backend >= 65) patientClass = 'qualified';
    else if (backend >= 50) patientClass = 'high_priority';
    else if (backend >= 35) patientClass = 'medium_priority';
    
    return { backend, display, patientClass, raw, penalty };
  }
}
