// src/core/offline/SyncEngine.ts
// Background sync on reconnect — cloud timestamp always wins

import { supabase } from '../../infrastructure/supabase/client';
import { mutationQueue, type PendingMutation } from './MutationQueue';
import { coreDrive } from './CORE_SYSTEM_DRIVE';

const SOFT_DELETE_TABLES = new Set([
  'analytics_daily_snapshots',
  'analytics_events',
  'analytics_patient_metrics',
  'audit_trail',
  'billing_events',
  'clinic_inquiries',
  'clinic_invoices',
  'clinic_patients',
  'clinic_procedures',
  'clinic_rooms',
  'clinic_users',
  'clinic_visit_sessions',
  'core_rules_config',
  'feature_flags',
  'inventory_ledger',
  'master_agenda_events',
  'master_tenants',
  'notification_queue',
  'patient_intake_responses',
  'patient_longitudinal_profiles',
  'pin_attempt_log',
  'pin_sessions',
  'retention_followups',
  'system_delivery_breaches',
  'tenant_devices',
  'tenant_health_scores',
]);

export const syncEngine = {
  async sync(): Promise<{ synced: number; failed: number }> {
    let synced = 0;
    let failed = 0;

    const pending = await mutationQueue.getAllPending();

    for (const mutation of pending) {
      try {
        await mutationQueue.markSyncing(mutation.id);
        await this.applyMutation(mutation);
        await mutationQueue.remove(mutation.id);
        synced++;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        await mutationQueue.markFailed(mutation.id, message);
        failed++;
      }
    }

    return { synced, failed };
  },

  async applyMutation(mutation: PendingMutation): Promise<void> {
    const { table, operation, payload } = mutation;

    if (operation === 'create') {
      const createPayload = payload as Record<string, unknown>;
      if (table === 'clinic_users') {
        if ('pin_code' in createPayload || 'password' in createPayload) {
          throw new Error('Offline clinic_users create cannot transmit legacy secret fields.');
        }
        if (createPayload.pin_hash != null && !/^\$2a\$(0[4-9]|[12][0-9]|3[01])\$[./A-Za-z0-9]{53}$/.test(String(createPayload.pin_hash))) {
          throw new Error('Offline clinic_users create requires an accepted bcrypt PIN hash.');
        }
      }
      if (table === 'pin_attempt_log') {
        createPayload.attempted_pin = '****';
      }
      const { error } = await (supabase as any).from(table).insert(createPayload);
      if (error) throw error;
    } else if (operation === 'update') {
      const { id, ...updates } = payload as Record<string, unknown>;
      if (table === 'clinic_users') {
        delete updates.pin_code;
        delete updates.password;
        if (updates.pin_hash != null && !/^\$2a\$(0[4-9]|[12][0-9]|3[01])\$[./A-Za-z0-9]{53}$/.test(String(updates.pin_hash))) {
          throw new Error('Offline clinic_users update requires an accepted bcrypt PIN hash.');
        }
      }
      if (table === 'pin_attempt_log') {
        updates.attempted_pin = '****';
      }
      const { error } = await (supabase as any).from(table).update(updates).eq('id', id);
      if (error) throw error;
    } else if (operation === 'delete') {
      if (!SOFT_DELETE_TABLES.has(table)) {
        throw new Error(`Offline delete is not supported for table without a verified soft-delete contract: ${table}`);
      }

      const id = (payload as Record<string, unknown>).id;
      if (typeof id !== 'string' || id.length === 0) {
        throw new Error('Offline soft-delete requires a valid record id');
      }

      const { error } = await (supabase as any)
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null);

      if (error) throw error;
    }
  },

  async pullLatest(table: string, tenantId: string): Promise<void> {
    const selectedColumns = table === 'clinic_users'
      ? 'id, tenant_id, email, full_name, full_name_ar, role, is_active, last_login_at, created_at, updated_at, employee_code, specialization, phone, deleted_at'
      : '*';
    const { data, error } = await (supabase as any)
      .from(table)
      .select(selectedColumns)
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    for (const row of (data || []) as Record<string, unknown>[]) {
      await coreDrive.put(table, row);
    }
  },
};