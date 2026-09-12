-- Migration 028: Restore canonical tenant licensing field before downstream migrations
-- Evidence: Blueprint §1 defines master_tenants.license_key as canonical and required;
-- migrations 029 and 034 consume the field before any later migration can create it.

ALTER TABLE master_tenants
  ADD COLUMN IF NOT EXISTS license_key VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS uq_master_tenants_license_key
  ON master_tenants(license_key)
  WHERE license_key IS NOT NULL;
