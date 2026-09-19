-- CORE SYSTEM v2.1 — Operational screen schema alignment
-- Evidence-backed forward compatibility migration.
-- Master #433 showed HTTP 400s from active screens because replayed base
-- migrations still exposed legacy column contracts. Production schema and
-- database.types.ts expose the canonical fields used by the active UI/RPCs.
--
-- Principles:
-- - additive / forward-only
-- - keep legacy columns for compatibility
-- - backfill only deterministic aliases
-- - do not change RLS or RPC signatures

-- 1) master_tenants — active Super Admin / tenant presentation contract.
ALTER TABLE public.master_tenants
  ADD COLUMN IF NOT EXISTS max_devices INTEGER,
  ADD COLUMN IF NOT EXISTS subscription_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS primary_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS country_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS currency_subunit INTEGER DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2) feature_flags — active flag manager/client contract.
ALTER TABLE public.feature_flags
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS flag_key VARCHAR(100),
  ADD COLUMN IF NOT EXISTS flag_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS allowed_tiers TEXT[],
  ADD COLUMN IF NOT EXISTS config_json JSONB,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE public.feature_flags
SET
  flag_key = COALESCE(flag_key, key),
  flag_name = COALESCE(flag_name, name),
  config_json = COALESCE(config_json, conditions)
WHERE flag_key IS NULL
   OR flag_name IS NULL
   OR config_json IS NULL;

CREATE INDEX IF NOT EXISTS idx_feature_flags_tenant_flag_key
  ON public.feature_flags (tenant_id, flag_key)
  WHERE deleted_at IS NULL;

-- 3) core_rules_config — active Core Rules manager/client contract.
ALTER TABLE public.core_rules_config
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS rule_category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS rule_key VARCHAR(150),
  ADD COLUMN IF NOT EXISTS rule_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS rule_value JSONB,
  ADD COLUMN IF NOT EXISTS is_overridable BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE public.core_rules_config
SET
  rule_category = COALESCE(rule_category, category),
  rule_key = COALESCE(rule_key, key),
  rule_name = COALESCE(rule_name, description, key),
  rule_value = COALESCE(rule_value, value)
WHERE rule_category IS NULL
   OR rule_key IS NULL
   OR rule_name IS NULL
   OR rule_value IS NULL;

CREATE INDEX IF NOT EXISTS idx_core_rules_config_tenant_rule_key
  ON public.core_rules_config (tenant_id, rule_key)
  WHERE deleted_at IS NULL;

-- 4) system_delivery_breaches — current health/breach read model.
ALTER TABLE public.system_delivery_breaches
  ADD COLUMN IF NOT EXISTS related_session_id UUID,
  ADD COLUMN IF NOT EXISTS related_user_id UUID,
  ADD COLUMN IF NOT EXISTS related_patient_id UUID,
  ADD COLUMN IF NOT EXISTS breach_details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS resolved_by UUID,
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE public.system_delivery_breaches
SET
  related_session_id = COALESCE(related_session_id, session_id),
  breach_details = COALESCE(
    breach_details,
    jsonb_build_object(
      'description', description,
      'impact', impact,
      'root_cause', root_cause,
      'resolution', resolution,
      'duration_seconds', duration_seconds,
      'affected_records', affected_records
    )
  ),
  resolved = COALESCE(resolved, status IN ('resolved', 'closed')),
  resolution_notes = COALESCE(resolution_notes, resolution)
WHERE related_session_id IS NULL
   OR breach_details IS NULL
   OR resolution_notes IS NULL;

CREATE INDEX IF NOT EXISTS idx_system_delivery_breaches_related_session
  ON public.system_delivery_breaches (related_session_id)
  WHERE deleted_at IS NULL;

-- 5) audit_trail — active Admin Audit viewer compatibility.
ALTER TABLE public.audit_trail
  ADD COLUMN IF NOT EXISTS actor_id UUID,
  ADD COLUMN IF NOT EXISTS actor_role TEXT,
  ADD COLUMN IF NOT EXISTS table_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS record_id UUID,
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE public.audit_trail
SET
  actor_id = COALESCE(actor_id, user_id),
  actor_role = COALESCE(actor_role, actor_type),
  table_name = COALESCE(table_name, entity_type),
  record_id = COALESCE(record_id, entity_id),
  updated_at = COALESCE(updated_at, created_at)
WHERE actor_id IS NULL
   OR actor_role IS NULL
   OR table_name IS NULL
   OR record_id IS NULL
   OR updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_audit_trail_active_created
  ON public.audit_trail (created_at DESC)
  WHERE deleted_at IS NULL;

-- 6) tenant_health_scores — current health dashboard contract.
ALTER TABLE public.tenant_health_scores
  ADD COLUMN IF NOT EXISTS score_date DATE,
  ADD COLUMN IF NOT EXISTS login_frequency_score SMALLINT,
  ADD COLUMN IF NOT EXISTS activity_score SMALLINT,
  ADD COLUMN IF NOT EXISTS patient_growth_score SMALLINT,
  ADD COLUMN IF NOT EXISTS feature_adoption_score SMALLINT,
  ADD COLUMN IF NOT EXISTS revenue_trend_score SMALLINT,
  ADD COLUMN IF NOT EXISTS score_details JSONB,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE public.tenant_health_scores
SET
  score_date = COALESCE(score_date, calculated_at::date, created_at::date),
  login_frequency_score = COALESCE(login_frequency_score, quality_score),
  activity_score = COALESCE(activity_score, reliability_score),
  patient_growth_score = COALESCE(patient_growth_score, growth_score),
  feature_adoption_score = COALESCE(feature_adoption_score, quality_score),
  revenue_trend_score = COALESCE(revenue_trend_score, financial_health_score),
  score_details = COALESCE(score_details, metadata)
WHERE score_date IS NULL
   OR login_frequency_score IS NULL
   OR activity_score IS NULL
   OR patient_growth_score IS NULL
   OR feature_adoption_score IS NULL
   OR revenue_trend_score IS NULL
   OR score_details IS NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_health_scores_tenant_date
  ON public.tenant_health_scores (tenant_id, score_date DESC)
  WHERE deleted_at IS NULL;

-- 7) clinic_invoices — current billing read/write contract.
ALTER TABLE public.clinic_invoices
  ADD COLUMN IF NOT EXISTS amount_paid_subunits INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_due_subunits INTEGER,
  ADD COLUMN IF NOT EXISTS invoice_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS doctor_par_confirmed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS collected_reception BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS match_triangulation BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS collected_by UUID,
  ADD COLUMN IF NOT EXISTS invoice_date DATE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE public.clinic_invoices
SET
  amount_paid_subunits = COALESCE(amount_paid_subunits, paid_subunits, 0),
  amount_due_subunits = COALESCE(amount_due_subunits, balance_subunits, total_subunits - COALESCE(paid_subunits, 0)),
  invoice_status = COALESCE(invoice_status, status),
  invoice_date = COALESCE(invoice_date, issued_at::date, created_at::date)
WHERE amount_paid_subunits IS NULL
   OR amount_due_subunits IS NULL
   OR invoice_status IS NULL
   OR invoice_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_clinic_invoices_tenant_date
  ON public.clinic_invoices (tenant_id, invoice_date DESC)
  WHERE deleted_at IS NULL;

-- 8) clinic_rooms — current room display contract.
ALTER TABLE public.clinic_rooms
  ADD COLUMN IF NOT EXISTS room_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS room_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS floor_number SMALLINT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE public.clinic_rooms
SET room_name = COALESCE(room_name, name)
WHERE room_name IS NULL;

CREATE INDEX IF NOT EXISTS idx_clinic_rooms_tenant_active
  ON public.clinic_rooms (tenant_id, room_name)
  WHERE deleted_at IS NULL AND is_active = TRUE;

-- 9) patient_longitudinal_profiles — current doctor/super-admin read contract.
ALTER TABLE public.patient_longitudinal_profiles
  ADD COLUMN IF NOT EXISTS historical_aps_avg SMALLINT,
  ADD COLUMN IF NOT EXISTS historical_dri_avg SMALLINT,
  ADD COLUMN IF NOT EXISTS historical_tsi_avg SMALLINT,
  ADD COLUMN IF NOT EXISTS historical_uri_avg SMALLINT,
  ADD COLUMN IF NOT EXISTS historical_pqs_avg SMALLINT,
  ADD COLUMN IF NOT EXISTS historical_rvs_avg SMALLINT,
  ADD COLUMN IF NOT EXISTS historical_core_score_avg SMALLINT,
  ADD COLUMN IF NOT EXISTS total_visits INTEGER,
  ADD COLUMN IF NOT EXISTS total_completed_visits INTEGER,
  ADD COLUMN IF NOT EXISTS total_no_shows INTEGER,
  ADD COLUMN IF NOT EXISTS total_cancellations INTEGER,
  ADD COLUMN IF NOT EXISTS total_revenue_subunits BIGINT,
  ADD COLUMN IF NOT EXISTS last_visit_date DATE,
  ADD COLUMN IF NOT EXISTS next_scheduled_visit DATE,
  ADD COLUMN IF NOT EXISTS loyalty_tier VARCHAR(50),
  ADD COLUMN IF NOT EXISTS dominant_disc_profile VARCHAR(20),
  ADD COLUMN IF NOT EXISTS profile_version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_calculated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_patient_longitudinal_active_patient
  ON public.patient_longitudinal_profiles (tenant_id, patient_id)
  WHERE deleted_at IS NULL;

-- 10) clinic_patients — score/status/DISC display fields used by doctor/reception.
ALTER TABLE public.clinic_patients
  ADD COLUMN IF NOT EXISTS core_score_display NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS dominant_disc_profile VARCHAR(20),
  ADD COLUMN IF NOT EXISTS patient_status VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_clinic_patients_tenant_active
  ON public.clinic_patients (tenant_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- 11) inventory_ledger — current operational inventory read contract.
ALTER TABLE public.inventory_ledger
  ADD COLUMN IF NOT EXISTS material_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS quantity_consumed NUMERIC,
  ADD COLUMN IF NOT EXISTS consumption_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS logged_by UUID,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE public.inventory_ledger
SET
  material_name = COALESCE(material_name, item_name),
  quantity_consumed = COALESCE(quantity_consumed, quantity),
  consumption_type = COALESCE(consumption_type, transaction_type),
  logged_by = COALESCE(logged_by, performed_by),
  updated_at = COALESCE(updated_at, created_at)
WHERE material_name IS NULL
   OR quantity_consumed IS NULL
   OR consumption_type IS NULL
   OR logged_by IS NULL
   OR updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_ledger_tenant_active
  ON public.inventory_ledger (tenant_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- 12) clinic_visit_sessions — canonical score/doctor/queue read fields.
ALTER TABLE public.clinic_visit_sessions
  ADD COLUMN IF NOT EXISTS is_insured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS doctor_id UUID,
  ADD COLUMN IF NOT EXISTS room_id UUID,
  ADD COLUMN IF NOT EXISTS waiting_time_minutes SMALLINT,
  ADD COLUMN IF NOT EXISTS session_duration_minutes SMALLINT,
  ADD COLUMN IF NOT EXISTS core_score_backend SMALLINT,
  ADD COLUMN IF NOT EXISTS core_score_display NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS patient_class VARCHAR(30),
  ADD COLUMN IF NOT EXISTS par_result VARCHAR(50),
  ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS session_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS session_ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS visit_closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scoring_mode VARCHAR(30),
  ADD COLUMN IF NOT EXISTS prestige_inflation_detected BOOLEAN,
  ADD COLUMN IF NOT EXISTS prestige_inflation_factor NUMERIC,
  ADD COLUMN IF NOT EXISTS triangulation_verified BOOLEAN,
  ADD COLUMN IF NOT EXISTS buffer_window_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_close_at TIMESTAMPTZ;

UPDATE public.clinic_visit_sessions
SET
  doctor_id = COALESCE(doctor_id, primary_doctor_id),
  room_id = COALESCE(room_id, assigned_room_id),
  waiting_time_minutes = COALESCE(waiting_time_minutes, wait_time_minutes::SMALLINT),
  session_duration_minutes = COALESCE(session_duration_minutes, total_time_minutes::SMALLINT),
  arrived_at = COALESCE(arrived_at, actual_check_in),
  session_started_at = COALESCE(session_started_at, actual_start),
  session_ended_at = COALESCE(session_ended_at, actual_end),
  visit_closed_at = COALESCE(visit_closed_at, actual_check_out)
WHERE doctor_id IS NULL
   OR room_id IS NULL
   OR waiting_time_minutes IS NULL
   OR session_duration_minutes IS NULL
   OR arrived_at IS NULL
   OR session_started_at IS NULL
   OR session_ended_at IS NULL
   OR visit_closed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_clinic_visit_sessions_tenant_active
  ON public.clinic_visit_sessions (tenant_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- 13) clinic_inquiries — current reception inquiry contract.
ALTER TABLE public.clinic_inquiries
  ADD COLUMN IF NOT EXISTS temp_patient_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS temp_phone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS inquiry_reason VARCHAR(500),
  ADD COLUMN IF NOT EXISTS procedures_requested TEXT[],
  ADD COLUMN IF NOT EXISTS initial_disc_guess VARCHAR(50),
  ADD COLUMN IF NOT EXISTS expected_objection VARCHAR(255),
  ADD COLUMN IF NOT EXISTS handled_by UUID,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE public.clinic_inquiries
SET
  temp_patient_name = COALESCE(temp_patient_name, patient_name),
  temp_phone = COALESCE(temp_phone, patient_phone),
  inquiry_reason = COALESCE(inquiry_reason, notes),
  handled_by = COALESCE(handled_by, assigned_to)
WHERE temp_patient_name IS NULL
   OR temp_phone IS NULL
   OR inquiry_reason IS NULL
   OR handled_by IS NULL;

CREATE INDEX IF NOT EXISTS idx_clinic_inquiries_tenant_active
  ON public.clinic_inquiries (tenant_id, created_at DESC)
  WHERE deleted_at IS NULL;
