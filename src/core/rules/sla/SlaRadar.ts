// src/core/rules/sla/SlaRadar.ts
// SLA: Green <14min | Yellow 15-24 | Red ≥25

import { supabase } from '../../../infrastructure/supabase/client';

export type SlaStatus = 'green' | 'yellow' | 'red';

export class SlaRadar {
  private thresholds = { greenMax: 14, yellowMax: 24, redMin: 25 };

  constructor() { this.loadThresholds(); }

  private async loadThresholds() {
    const { data } = await supabase.from('core_rules_config').select('rule_value').eq('rule_key', 'wait_times').is('tenant_id', null).single();
    if (data?.rule_value) {
      this.thresholds = { greenMax: data.rule_value.green_max_minutes ?? 14, yellowMax: data.rule_value.yellow_max_minutes ?? 24, redMin: data.rule_value.red_min_minutes ?? 25 };
    }
  }

  compute(waitMinutes: number) {
    if (waitMinutes <= this.thresholds.greenMax) return { status: 'green' as SlaStatus, waitMinutes, color: '#22c55e', label: 'On Time' };
    if (waitMinutes <= this.thresholds.yellowMax) return { status: 'yellow' as SlaStatus, waitMinutes, color: '#eab308', label: 'Warning' };
    return { status: 'red' as SlaStatus, waitMinutes, color: '#ef4444', label: 'Breach' };
  }

  isRedBreach(waitMinutes: number): boolean { return waitMinutes >= this.thresholds.redMin; }
  getRemainingSeconds(waitMinutes: number): number { return Math.max(0, (this.thresholds.redMin - waitMinutes) * 60); }
}

export const slaRadar = new SlaRadar();
