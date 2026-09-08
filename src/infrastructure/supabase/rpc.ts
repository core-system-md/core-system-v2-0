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

export interface DailySnapshot {
  total_visits: number;
  total_new_patients: number;
  total_returning_patients: number;
  total_no_shows: number;
  total_cancellations: number;
  avg_wait_time_minutes: number;
  avg_session_duration_minutes: number;
  avg_core_score: number;
  total_revenue_subunits: number;
  total_discounts_subunits: number;
  sla_breaches_count: number;
  hot_leads_count: number;
  conversion_rate: number;
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
      p_timeout_minutes: timeoutMinutes,
    });
    if (error) throw error;
    return data as number;
  },

  async generateDailySnapshot(tenantId: string, date: string): Promise<DailySnapshot> {
    const { data, error } = await supabase.rpc('compute_daily_snapshot', {
      p_tenant_id: tenantId,
      p_date: date,
    });
    if (error) throw error;
    return data as unknown as DailySnapshot;
  },

  async processNotifications(batchSize: number = 50) {
    const { data, error } = await supabase.rpc('process_pending_notifications', {
      p_batch_size: batchSize,
    });
    if (error) throw error;
    return data as number;
  },
};
