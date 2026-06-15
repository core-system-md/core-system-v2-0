// src/shared/hooks/useAuditLog.ts
// Typed audit write helper

import { supabase } from '../../infrastructure/supabase/client';
import type { AuditAction } from '../../shared/types/database';

export interface AuditPayload {
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changedFields?: string[];
  metadata?: Record<string, unknown>;
}

export function useAuditLog() {
  const write = async (payload: AuditPayload) => {
    const { error } = await supabase.from('audit_trail').insert({
      action: payload.action,
      entity_type: payload.entityType,
      entity_id: payload.entityId,
      old_values: payload.oldValues ?? {},
      new_values: payload.newValues ?? {},
      changed_fields: payload.changedFields ?? [],
      metadata: payload.metadata ?? {},
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Audit write failed:', error);
    }
  };

  return { write };
}
