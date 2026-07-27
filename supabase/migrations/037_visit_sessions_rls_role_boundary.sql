-- Migration 037: Add role boundary to clinic_visit_sessions UPDATE policy
-- Date: 2026-07-27
-- Scope: ONE TABLE + ONE POLICY + ONE MINIMAL BOUNDARY
--
-- Problem: visit_sessions_update was tenant-scoped only, allowing any tenant
-- user (including receptionist) to UPDATE clinical notes and scores.
--
-- Constitution §6: Receptionist CANNOT modify clinical notes or scores.
-- permissionMatrix: edit_sessions → doctor, clinic_admin, super_admin only.
--
-- Solution: Add role predicate using canonical JWT-based helpers.

DROP POLICY IF EXISTS visit_sessions_update ON clinic_visit_sessions;

CREATE POLICY visit_sessions_update ON clinic_visit_sessions
  FOR UPDATE
  TO authenticated
  USING (
    (tenant_id = get_current_tenant_id()
     AND get_current_user_role() IN ('doctor', 'clinic_admin'))
    OR get_current_user_role() = 'super_admin'
  );
