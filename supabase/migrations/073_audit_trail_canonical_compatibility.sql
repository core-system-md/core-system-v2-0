-- 073_audit_trail_canonical_compatibility.sql
-- Restore the canonical audit-trail fields required by the Blueprint,
-- Constitution, existing audit triggers, and active audit viewer.
-- Existing governance columns remain intact for backward compatibility.

ALTER TABLE public.audit_trail
  ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES public.clinic_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actor_role TEXT,
  ADD COLUMN IF NOT EXISTS table_name TEXT,
  ADD COLUMN IF NOT EXISTS record_id UUID,
  ADD COLUMN IF NOT EXISTS reason TEXT;

ALTER TABLE public.audit_trail
  ALTER COLUMN actor_type SET DEFAULT 'system';

ALTER TABLE public.audit_trail
  DROP CONSTRAINT IF EXISTS audit_trail_action_check;

ALTER TABLE public.audit_trail
  ADD CONSTRAINT audit_trail_action_check
  CHECK (LOWER(action) IN ('create', 'update', 'delete', 'login', 'logout', 'export', 'import', 'view', 'other'));

CREATE INDEX IF NOT EXISTS idx_audit_trail_actor_id
  ON public.audit_trail(actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_trail_table_record
  ON public.audit_trail(table_name, record_id);
