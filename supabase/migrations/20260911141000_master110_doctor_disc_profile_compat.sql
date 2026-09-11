-- Master Test #110 compatibility for the active Doctor profile query.
-- Production has the DISC profile in patient_longitudinal_profiles; the active
-- Doctor surface currently reads clinic_patients. Keep this additive and
-- backfill from the canonical longitudinal profile when available.
ALTER TABLE public.clinic_patients
  ADD COLUMN IF NOT EXISTS dominant_disc_profile varchar(20);

UPDATE public.clinic_patients p
SET dominant_disc_profile = COALESCE(p.dominant_disc_profile, lp.dominant_disc_profile)
FROM public.patient_longitudinal_profiles lp
WHERE lp.patient_id = p.id
  AND lp.tenant_id = p.tenant_id
  AND p.dominant_disc_profile IS NULL
  AND lp.dominant_disc_profile IS NOT NULL;
