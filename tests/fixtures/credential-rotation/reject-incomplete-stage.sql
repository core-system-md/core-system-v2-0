\ir ./contracts.sql
\ir ../../../supabase/runbooks/prepare_credential_rotation.sql

-- Deliberately omit one active user; the apply script must reject the mismatch.
INSERT INTO pg_temp.mdcore_rotation_staff_stage (tenant_id, staff_id, pin_hash, pin_length)
SELECT u.tenant_id, u.id, s.staged_hash_a, 8
FROM public.clinic_users u JOIN public.rotation_rehearsal_state s ON s.tenant_id = u.tenant_id
WHERE u.employee_code = 'REHEARSAL-A';

INSERT INTO pg_temp.mdcore_rotation_license_stage (tenant_id, new_license_key)
SELECT tenant_id, staged_license_key FROM public.rotation_rehearsal_state;

\ir ../../../supabase/runbooks/apply_credential_rotation.sql
