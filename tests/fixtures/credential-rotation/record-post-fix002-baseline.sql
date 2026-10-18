-- Refresh expected pre-rotation snapshots after FIX-002 repairs legacy hashes.
-- This file prints no row values and only runs against the disposable fixture.
UPDATE public.rotation_rehearsal_state s
SET original_hash_a = a.pin_hash,
    original_hash_b = b.pin_hash
FROM public.clinic_users a
JOIN public.clinic_users b ON b.tenant_id = a.tenant_id
WHERE a.tenant_id = s.tenant_id
  AND a.employee_code = 'REHEARSAL-A'
  AND b.employee_code = 'REHEARSAL-B';
