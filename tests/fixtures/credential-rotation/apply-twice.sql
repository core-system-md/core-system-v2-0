-- Successful rehearsal: one temporary session and identical stage data for both applies.
\ir ./contracts.sql
DROP TRIGGER IF EXISTS rotation_rehearsal_corrupt_hash_trigger ON public.clinic_users;
DROP FUNCTION IF EXISTS public.rotation_rehearsal_corrupt_hash();

\ir ../../../supabase/runbooks/prepare_credential_rotation.sql

INSERT INTO pg_temp.mdcore_rotation_staff_stage (tenant_id, staff_id, pin_hash, pin_length)
SELECT u.tenant_id, u.id,
       CASE u.employee_code WHEN 'REHEARSAL-A' THEN s.staged_hash_a WHEN 'REHEARSAL-B' THEN s.staged_hash_b END,
       8
FROM public.clinic_users u JOIN public.rotation_rehearsal_state s ON s.tenant_id = u.tenant_id;

INSERT INTO pg_temp.mdcore_rotation_license_stage (tenant_id, new_license_key)
SELECT tenant_id, staged_license_key FROM public.rotation_rehearsal_state;

\ir ../../../supabase/runbooks/apply_credential_rotation.sql

CREATE TEMP TABLE rotation_first_users ON COMMIT PRESERVE ROWS AS
SELECT u.id, u.pin_hash, u.pin_code, u.updated_at
FROM public.clinic_users u JOIN public.rotation_rehearsal_state s ON s.tenant_id = u.tenant_id;

CREATE TEMP TABLE rotation_first_tenant ON COMMIT PRESERVE ROWS AS
SELECT t.id, t.license_key
FROM public.master_tenants t JOIN public.rotation_rehearsal_state s ON s.tenant_id = t.id;

CREATE TEMP TABLE rotation_first_sessions ON COMMIT PRESERVE ROWS AS
SELECT ps.id, ps.deleted_at
FROM public.pin_sessions ps JOIN public.rotation_rehearsal_state s ON s.tenant_id = ps.tenant_id;

\ir ../../../supabase/runbooks/apply_credential_rotation.sql

DO $assert_idempotent$
BEGIN
  IF EXISTS (
    SELECT 1 FROM rotation_first_users f
    LEFT JOIN public.clinic_users u ON u.id = f.id
    WHERE u.id IS NULL OR u.pin_hash IS DISTINCT FROM f.pin_hash
       OR u.pin_code IS DISTINCT FROM f.pin_code OR u.updated_at IS DISTINCT FROM f.updated_at
  ) OR EXISTS (
    SELECT 1 FROM public.clinic_users u
    JOIN public.rotation_rehearsal_state s ON s.tenant_id = u.tenant_id
    LEFT JOIN rotation_first_users f ON f.id = u.id
    WHERE f.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Second rotation apply changed the staff snapshot.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM rotation_first_tenant f
    LEFT JOIN public.master_tenants t ON t.id = f.id
    WHERE t.id IS NULL OR t.license_key IS DISTINCT FROM f.license_key
  ) THEN
    RAISE EXCEPTION 'Second rotation apply changed the tenant snapshot.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM rotation_first_sessions f
    LEFT JOIN public.pin_sessions ps ON ps.id = f.id
    WHERE ps.id IS NULL OR ps.deleted_at IS DISTINCT FROM f.deleted_at
  ) OR EXISTS (
    SELECT 1 FROM public.pin_sessions ps
    JOIN public.rotation_rehearsal_state s ON s.tenant_id = ps.tenant_id
    LEFT JOIN rotation_first_sessions f ON f.id = ps.id
    WHERE f.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Second rotation apply changed the session snapshot.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.pin_sessions ps
    JOIN public.rotation_rehearsal_state s ON s.tenant_id = ps.tenant_id
    WHERE ps.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'One or more live sessions remain after rotation.';
  END IF;
END;
$assert_idempotent$;
