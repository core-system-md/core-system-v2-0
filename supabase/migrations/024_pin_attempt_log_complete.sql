-- Migration 024: Complete pin_attempt_log security overhaul
-- 1. Add staff_id column for user-level tracking
-- 2. Ensure tenant/role helpers exist before policies reference them
-- 3. Add RLS policies with proper role-based access

-- Step 1: Add staff_id column (nullable for backward compatibility)
ALTER TABLE pin_attempt_log 
ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES clinic_users(id);

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_pin_attempts_staff 
ON pin_attempt_log(staff_id) 
WHERE staff_id IS NOT NULL;

-- Step 3: Provide the authorization helpers required by the policies in this migration.
-- These are aligned with the later canonical app_metadata implementation and are
-- intentionally created here because migration 024 executes before migration 034/053.
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN NULLIF(auth.jwt()->'app_metadata'->>'tenant_id', '')::UUID;
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN NULLIF(auth.jwt()->'app_metadata'->>'user_role', '');
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$;

-- Step 4: Enable RLS
ALTER TABLE pin_attempt_log ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS rls_pin_attempts_super_admin ON pin_attempt_log;
DROP POLICY IF EXISTS rls_pin_attempts_clinic_admin ON pin_attempt_log;
DROP POLICY IF EXISTS rls_pin_attempts_receptionist ON pin_attempt_log;
DROP POLICY IF EXISTS rls_pin_attempts_own ON pin_attempt_log;
DROP POLICY IF EXISTS rls_pin_attempts_insert ON pin_attempt_log;

-- Step 6: Create new policies

-- Super admin: full access to all tenants
CREATE POLICY rls_pin_attempts_super_admin ON pin_attempt_log
  FOR ALL
  USING (get_current_user_role() = 'super_admin');

-- Clinic admin: full access within their tenant
CREATE POLICY rls_pin_attempts_clinic_admin ON pin_attempt_log
  FOR ALL
  USING (
    get_current_user_role() = 'clinic_admin'
    AND tenant_id = get_current_tenant_id()
  );

-- Receptionist: read-only within their tenant
CREATE POLICY rls_pin_attempts_receptionist ON pin_attempt_log
  FOR SELECT
  USING (
    get_current_user_role() = 'receptionist'
    AND tenant_id = get_current_tenant_id()
  );

-- Staff can see their OWN attempts only
CREATE POLICY rls_pin_attempts_own ON pin_attempt_log
  FOR SELECT
  USING (staff_id = auth.uid());

-- System insert: must belong to current tenant
CREATE POLICY rls_pin_attempts_insert ON pin_attempt_log
  FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND (staff_id = auth.uid() OR staff_id IS NULL)
  );

-- Step 7: Add comment for documentation
COMMENT ON TABLE pin_attempt_log IS 'PIN attempt audit log - RLS protected, staff_id added for user tracking';
