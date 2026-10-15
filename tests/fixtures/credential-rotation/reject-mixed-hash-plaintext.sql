-- Expected to fail before changing any rows.
CREATE OR REPLACE FUNCTION public.create_pin_session(p_tenant_id UUID, p_pin TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = ''
AS $bad$
  SELECT EXISTS (
    SELECT 1 FROM public.clinic_users u
    WHERE u.tenant_id = p_tenant_id
      AND u.pin_hash = extensions.crypt(p_pin, u.pin_hash)
      AND u.pin_code = p_pin
  )
$bad$;

DO $confirm_bad_definition$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'create_pin_session'
      AND pg_get_functiondef(p.oid) ILIKE '%pin_hash%'
      AND pg_get_functiondef(p.oid) ~* '([[:alnum:]_]+\.)?pin_code[[:space:]]*=[[:space:]]*p_pin([[:space:]]|$)|p_pin[[:space:]]*=[[:space:]]*([[:alnum:]_]+\.)?pin_code'
  ) THEN
    RAISE EXCEPTION 'Test setup did not create the mixed PIN contract.';
  END IF;
END;
$confirm_bad_definition$;

\ir ../../../supabase/runbooks/prepare_credential_rotation.sql

INSERT INTO pg_temp.mdcore_rotation_staff_stage (tenant_id, staff_id, pin_hash, pin_length)
SELECT u.tenant_id, u.id,
       CASE u.employee_code WHEN 'REHEARSAL-A' THEN s.staged_hash_a WHEN 'REHEARSAL-B' THEN s.staged_hash_b END,
       8
FROM public.clinic_users u JOIN public.rotation_rehearsal_state s ON s.tenant_id = u.tenant_id;

INSERT INTO pg_temp.mdcore_rotation_license_stage (tenant_id, new_license_key)
SELECT tenant_id, staged_license_key FROM public.rotation_rehearsal_state;

\ir ../../../supabase/runbooks/apply_credential_rotation.sql
