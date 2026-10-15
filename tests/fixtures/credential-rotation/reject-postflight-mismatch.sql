\ir ./contracts.sql

-- Test-only trigger corrupts the hash during the UPDATE. Postflight must fail
-- and the surrounding apply transaction must roll back every table update.
CREATE OR REPLACE FUNCTION public.rotation_rehearsal_corrupt_hash()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $corrupt$
BEGIN
  NEW.pin_hash := extensions.crypt('synthetic-only-postflight-mismatch', extensions.gen_salt('bf', 8));
  RETURN NEW;
END;
$corrupt$;

CREATE TRIGGER rotation_rehearsal_corrupt_hash_trigger
BEFORE UPDATE OF pin_hash ON public.clinic_users
FOR EACH ROW EXECUTE FUNCTION public.rotation_rehearsal_corrupt_hash();

\ir ../../../supabase/runbooks/prepare_credential_rotation.sql

INSERT INTO pg_temp.mdcore_rotation_staff_stage (tenant_id, staff_id, pin_hash, pin_length)
SELECT u.tenant_id, u.id,
       CASE u.employee_code WHEN 'REHEARSAL-A' THEN s.staged_hash_a WHEN 'REHEARSAL-B' THEN s.staged_hash_b END,
       8
FROM public.clinic_users u JOIN public.rotation_rehearsal_state s ON s.tenant_id = u.tenant_id;

INSERT INTO pg_temp.mdcore_rotation_license_stage (tenant_id, new_license_key)
SELECT tenant_id, staged_license_key FROM public.rotation_rehearsal_state;

\ir ../../../supabase/runbooks/apply_credential_rotation.sql
