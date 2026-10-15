-- Runtime-only template. The rehearsal runner replaces the placeholder with a real
-- bcrypt $2b$ hash produced by Python bcrypt and does not log the hash or source PIN.
\ir ./contracts.sql
\ir ../../../supabase/runbooks/prepare_credential_rotation.sql

INSERT INTO pg_temp.mdcore_rotation_staff_stage (tenant_id, staff_id, pin_hash, pin_length)
SELECT u.tenant_id, u.id,
       CASE u.employee_code
         WHEN 'REHEARSAL-A' THEN '__RUNTIME_BCRYPT_2B_HASH__'
         WHEN 'REHEARSAL-B' THEN s.staged_hash_b
       END,
       8
FROM public.clinic_users u
JOIN public.rotation_rehearsal_state s ON s.tenant_id = u.tenant_id;

INSERT INTO pg_temp.mdcore_rotation_license_stage (tenant_id, new_license_key)
SELECT tenant_id, staged_license_key
FROM public.rotation_rehearsal_state;

\ir ../../../supabase/runbooks/apply_credential_rotation.sql
