-- P83: cover the pin_sessions.staff_id foreign key with a dedicated index.
-- Evidence: Supabase Performance Advisor reported pin_sessions_staff_id_fkey
-- without a covering index. Existing lookup indexes begin with tenant_id, so
-- they do not provide a staff_id-leading index for FK maintenance/query paths.
-- No data, RLS, Auth, or RPC contract is changed.

CREATE INDEX IF NOT EXISTS idx_pin_sessions_staff_id
  ON public.pin_sessions (staff_id);
