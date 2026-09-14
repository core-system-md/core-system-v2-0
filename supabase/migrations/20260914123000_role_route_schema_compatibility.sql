-- CORE SYSTEM v2.1 — role-route schema compatibility
-- Evidence-first repair for Master Test HTTP 400 responses.
-- Purpose: make a fresh migration replay expose the same canonical columns
-- already present in the verified production schema, without destructive
-- changes or changes to auth/RLS contracts.

BEGIN;

ALTER TABLE public.clinic_patients
  ADD COLUMN IF NOT EXISTS phone_primary TEXT,
  ADD COLUMN IF NOT EXISTS patient_status VARCHAR(50);

ALTER TABLE public.clinic_rooms
  ADD COLUMN IF NOT EXISTS room_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS room_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS floor_number SMALLINT;

ALTER TABLE public.clinic_invoices
  ADD COLUMN IF NOT EXISTS invoice_date DATE,
  ADD COLUMN IF NOT EXISTS invoice_status VARCHAR(30),
  ADD COLUMN IF NOT EXISTS subtotal_subunits INTEGER,
  ADD COLUMN IF NOT EXISTS tax_subunits INTEGER,
  ADD COLUMN IF NOT EXISTS discount_subunits INTEGER,
  ADD COLUMN IF NOT EXISTS total_subunits INTEGER,
  ADD COLUMN IF NOT EXISTS amount_paid_subunits INTEGER,
  ADD COLUMN IF NOT EXISTS amount_due_subunits INTEGER,
  ADD COLUMN IF NOT EXISTS collected_reception BOOLEAN;

ALTER TABLE public.patient_longitudinal_profiles
  ADD COLUMN IF NOT EXISTS total_visits INTEGER,
  ADD COLUMN IF NOT EXISTS total_completed_visits INTEGER,
  ADD COLUMN IF NOT EXISTS total_revenue_subunits BIGINT,
  ADD COLUMN IF NOT EXISTS last_visit_date DATE,
  ADD COLUMN IF NOT EXISTS loyalty_tier VARCHAR(50);

ALTER TABLE public.inventory_ledger
  ADD COLUMN IF NOT EXISTS material_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS quantity_consumed NUMERIC,
  ADD COLUMN IF NOT EXISTS consumption_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS logged_by UUID;

ALTER TABLE public.tenant_health_scores
  ADD COLUMN IF NOT EXISTS score_date DATE,
  ADD COLUMN IF NOT EXISTS login_frequency_score SMALLINT,
  ADD COLUMN IF NOT EXISTS activity_score SMALLINT,
  ADD COLUMN IF NOT EXISTS patient_growth_score SMALLINT,
  ADD COLUMN IF NOT EXISTS feature_adoption_score SMALLINT,
  ADD COLUMN IF NOT EXISTS revenue_trend_score SMALLINT;

ALTER TABLE public.feature_flags
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS flag_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS flag_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS allowed_tiers TEXT[],
  ADD COLUMN IF NOT EXISTS config_json JSONB;

ALTER TABLE public.core_rules_config
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS rule_category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS rule_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS rule_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS rule_value JSONB,
  ADD COLUMN IF NOT EXISTS config_json JSONB;

ALTER TABLE public.system_delivery_breaches
  ADD COLUMN IF NOT EXISTS related_session_id UUID,
  ADD COLUMN IF NOT EXISTS related_user_id UUID,
  ADD COLUMN IF NOT EXISTS related_patient_id UUID,
  ADD COLUMN IF NOT EXISTS breach_details JSONB,
  ADD COLUMN IF NOT EXISTS resolved BOOLEAN,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

ALTER TABLE public.clinic_visit_sessions
  ADD COLUMN IF NOT EXISTS waiting_time_minutes SMALLINT;

UPDATE public.clinic_patients
SET phone_primary = COALESCE(phone_primary, phone)
WHERE phone_primary IS NULL;

UPDATE public.clinic_rooms
SET room_name = COALESCE(room_name, name)
WHERE room_name IS NULL;

UPDATE public.patient_longitudinal_profiles
SET total_visits = COALESCE(total_visits, 0),
    total_completed_visits = COALESCE(total_completed_visits, 0),
    total_revenue_subunits = COALESCE(total_revenue_subunits, 0)
WHERE total_visits IS NULL OR total_completed_visits IS NULL OR total_revenue_subunits IS NULL;

UPDATE public.tenant_health_scores
SET score_date = COALESCE(score_date, calculated_at::date),
    login_frequency_score = COALESCE(login_frequency_score, 0),
    activity_score = COALESCE(activity_score, 0),
    patient_growth_score = COALESCE(patient_growth_score, 0),
    feature_adoption_score = COALESCE(feature_adoption_score, 0),
    revenue_trend_score = COALESCE(revenue_trend_score, 0)
WHERE score_date IS NULL
   OR login_frequency_score IS NULL
   OR activity_score IS NULL
   OR patient_growth_score IS NULL
   OR feature_adoption_score IS NULL
   OR revenue_trend_score IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clinic_invoices' AND column_name='issued_at') THEN
    EXECUTE 'UPDATE public.clinic_invoices SET invoice_date = COALESCE(invoice_date, issued_at::date) WHERE invoice_date IS NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clinic_invoices' AND column_name='status') THEN
    EXECUTE 'UPDATE public.clinic_invoices SET invoice_status = COALESCE(invoice_status, status) WHERE invoice_status IS NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='feature_flags' AND column_name='key') THEN
    EXECUTE 'UPDATE public.feature_flags SET flag_key = COALESCE(flag_key, key) WHERE flag_key IS NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='feature_flags' AND column_name='name') THEN
    EXECUTE 'UPDATE public.feature_flags SET flag_name = COALESCE(flag_name, name) WHERE flag_name IS NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='feature_flags' AND column_name='conditions') THEN
    EXECUTE 'UPDATE public.feature_flags SET config_json = COALESCE(config_json, conditions) WHERE config_json IS NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_rules_config' AND column_name='key') THEN
    EXECUTE 'UPDATE public.core_rules_config SET rule_key = COALESCE(rule_key, key), rule_name = COALESCE(rule_name, key) WHERE rule_key IS NULL OR rule_name IS NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_rules_config' AND column_name='category') THEN
    EXECUTE 'UPDATE public.core_rules_config SET rule_category = COALESCE(rule_category, category) WHERE rule_category IS NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_rules_config' AND column_name='value') THEN
    EXECUTE 'UPDATE public.core_rules_config SET rule_value = COALESCE(rule_value, value), config_json = COALESCE(config_json, value) WHERE rule_value IS NULL OR config_json IS NULL';
  END IF;
END;
$$;

COMMIT;
