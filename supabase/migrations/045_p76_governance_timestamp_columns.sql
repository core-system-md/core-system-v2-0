-- P76: Constitution-required created_at / updated_at columns.
-- Existing domain timestamps are used to preserve historical meaning where available.

ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS created_at timestamptz;
UPDATE public.analytics_events SET created_at = occurred_at WHERE created_at IS NULL;
ALTER TABLE public.analytics_events ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.analytics_events ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS updated_at timestamptz;
UPDATE public.analytics_events SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE public.analytics_events ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.analytics_events ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.analytics_patient_metrics ADD COLUMN IF NOT EXISTS updated_at timestamptz;
UPDATE public.analytics_patient_metrics SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE public.analytics_patient_metrics ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.analytics_patient_metrics ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.audit_trail ADD COLUMN IF NOT EXISTS updated_at timestamptz;
UPDATE public.audit_trail SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE public.audit_trail ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.audit_trail ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.billing_events ADD COLUMN IF NOT EXISTS updated_at timestamptz;
UPDATE public.billing_events SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE public.billing_events ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.billing_events ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.inventory_ledger ADD COLUMN IF NOT EXISTS updated_at timestamptz;
UPDATE public.inventory_ledger SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE public.inventory_ledger ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.inventory_ledger ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.notification_queue ADD COLUMN IF NOT EXISTS updated_at timestamptz;
UPDATE public.notification_queue SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE public.notification_queue ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.notification_queue ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.pin_attempt_log ADD COLUMN IF NOT EXISTS updated_at timestamptz;
UPDATE public.pin_attempt_log SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE public.pin_attempt_log ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.pin_attempt_log ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.pin_sessions ADD COLUMN IF NOT EXISTS updated_at timestamptz;
UPDATE public.pin_sessions SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE public.pin_sessions ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.pin_sessions ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.system_delivery_breaches ADD COLUMN IF NOT EXISTS updated_at timestamptz;
UPDATE public.system_delivery_breaches SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE public.system_delivery_breaches ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.system_delivery_breaches ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.tenant_devices ADD COLUMN IF NOT EXISTS created_at timestamptz;
UPDATE public.tenant_devices SET created_at = COALESCE(registered_at, NOW()) WHERE created_at IS NULL;
ALTER TABLE public.tenant_devices ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.tenant_devices ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.tenant_devices ADD COLUMN IF NOT EXISTS updated_at timestamptz;
UPDATE public.tenant_devices SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE public.tenant_devices ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.tenant_devices ALTER COLUMN updated_at SET NOT NULL;
