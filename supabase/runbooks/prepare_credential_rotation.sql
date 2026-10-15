-- CORE SYSTEM v2.1 — credential rotation staging
-- NOT a migration. This creates TEMPORARY tables in the current database session only.
-- Use only on a disposable local Supabase stack or an approved isolated branch.
-- Do not populate these tables by embedding raw PINs or a license key in SQL text.
-- Populate through a trusted client using parameter binding; see docs/runbooks/credential-rotation.md.

CREATE TEMP TABLE mdcore_rotation_staff_stage (
  tenant_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  pin_hash TEXT NOT NULL,
  pin_length SMALLINT NOT NULL CHECK (pin_length >= 6),
  PRIMARY KEY (tenant_id, staff_id)
) ON COMMIT PRESERVE ROWS;

CREATE TEMP TABLE mdcore_rotation_license_stage (
  tenant_id UUID PRIMARY KEY,
  new_license_key TEXT NOT NULL CHECK (length(trim(new_license_key)) > 0)
) ON COMMIT PRESERVE ROWS;
