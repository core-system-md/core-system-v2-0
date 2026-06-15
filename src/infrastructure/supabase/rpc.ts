// src/infrastructure/supabase/rpc.ts
// Typed RPC function wrappers for Edge Functions and DB functions

import { supabase } from './client';

export interface ScorePayload {
  session_id: string;
  indicators: {
    aps: number;
    dri: number;
    rvs: number;
    uri: number;
    tsi: number;
    pqs: number;
  };
}

export interface LicensePayload {
  tenant_id: string;
  device_fingerprint: string;
  user_id: string;
}

export const rpc = {
  // Edge Functions (via supabase.functions.invoke)
  async calculateScore(payload: ScorePayload) {
    const { data, error } = await supabase.functions.invoke('score-calculator', {
      body: payload,
    });
    if (error) throw error;
    return data as { session_id: string; backend: number; display: number; patient_class: string };
  },

  async validateLicense(payload: LicensePayload) {
    const { data, error } = await supabase.functions.invoke('license-validator', {
      body: payload,
    });
    if (error) throw error;
    return data as { valid: boolean; device_id?: string; reason?: string };
  },

  // PostgreSQL RPC functions (via supabase.rpc)
  async releaseAbandonedLocks(timeoutMinutes: number = 10) {
    const { data, error } = await supabase.rpc('release_abandoned_locks', {
      timeout_minutes: timeoutMinutes,
    });
    if (error) throw error;
    return data as number;
  },

  async detectLeakageGaps() {
    const { data, error } = await supabase.rpc('detect_leakage_gaps');
    if (error) throw error;
    return data as number;
  },

  async generateDailySnapshot(date: string) {
    const { data, error } = await supabase.rpc('generate_daily_snapshot', {
      snapshot_date: date,
    });
    if (error) throw error;
    return data as number;
  },

  async processNotifications(batchSize: number = 50) {
    const { data, error } = await supabase.rpc('process_pending_notifications', {
      batch_size: batchSize,
    });
    if (error) throw error;
    return data as number;
  },
};
