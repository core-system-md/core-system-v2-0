SELECT (
  (SELECT count(*)
   FROM public.clinic_users u
   JOIN public.rotation_rehearsal_state s ON s.tenant_id = u.tenant_id
   WHERE u.pin_code IS NULL
     AND u.pin_hash IS NOT DISTINCT FROM
       CASE u.employee_code
         WHEN 'REHEARSAL-A' THEN s.staged_hash_a
         WHEN 'REHEARSAL-B' THEN s.staged_hash_b
         ELSE NULL
       END) = 2
  AND EXISTS (
    SELECT 1 FROM public.master_tenants t
    JOIN public.rotation_rehearsal_state s ON s.tenant_id = t.id
    WHERE t.license_key = s.staged_license_key
  )
  AND (SELECT count(*)
       FROM public.pin_sessions ps
       JOIN public.rotation_rehearsal_state s ON s.tenant_id = ps.tenant_id
       WHERE ps.deleted_at IS NOT NULL) = 2
  AND (SELECT count(*)
       FROM public.pin_sessions ps
       JOIN public.rotation_rehearsal_state s ON s.tenant_id = ps.tenant_id
       WHERE ps.deleted_at IS NULL) = 0
)::text;
