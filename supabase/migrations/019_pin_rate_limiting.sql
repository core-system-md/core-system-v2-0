-- 019_pin_rate_limiting.sql
-- PIN attempt logging for rate limiting

CREATE TABLE IF NOT EXISTS pin_attempt_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES master_tenants(id),
  attempted_pin VARCHAR(4),
  success BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pin_attempts ON pin_attempt_log(tenant_id, created_at DESC);
