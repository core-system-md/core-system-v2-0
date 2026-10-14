-- P152 — Reconcile remaining production/application schema contracts.
-- Evidence: the latest role-route E2E returned PostgreSQL 42703 errors for the
-- production-facing columns below. Production information_schema confirms these
-- contracts exist; clean migration replay still used the older baseline shape.
-- Scope is additive compatibility + backfill. Existing legacy columns/rows and
-- RLS policies are preserved; no live production database is mutated by this file.

-- Core rule management: preserve the platform-global legacy rows (tenant_id NULL)
-- and expose the modern, descriptive projection consumed by the admin UI.
ALTER TABLE public.core_rules_config
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS rule_category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS rule_key VARCHAR(150),
  ADD COLUMN IF NOT EXISTS rule_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS rule_value JSONB,
  ADD COLUMN IF NOT EXISTS is_overridable BOOLEAN,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE public.core_rules_config
SET rule_category = COALESCE(rule_category, category),
    rule_key = COALESCE(rule_key, key),
    rule_name = COALESCE(rule_name, NULLIF(description, ''), key),
    rule_value = COALESCE(rule_value, value, '{}'::jsonb),
    is_overridable = COALESCE(is_overridable, FALSE)
WHERE rule_category IS NULL
   OR rule_key IS NULL
   OR rule_name IS NULL
   OR rule_value IS NULL
   OR is_overridable IS NULL;

ALTER TABLE public.core_rules_config
  ALTER COLUMN rule_category SET NOT NULL,
  ALTER COLUMN rule_key SET NOT NULL,
  ALTER COLUMN rule_name SET NOT NULL,
  ALTER COLUMN rule_value SET DEFAULT '{}'::jsonb,
  ALTER COLUMN is_overridable SET DEFAULT FALSE;

-- Delivery/SLA breach read models evolved from the original entity/session model.
ALTER TABLE public.system_delivery_breaches
  ADD COLUMN IF NOT EXISTS related_session_id UUID,
  ADD COLUMN IF NOT EXISTS related_user_id UUID,
  ADD COLUMN IF NOT EXISTS related_patient_id UUID,
  ADD COLUMN IF NOT EXISTS breach_details JSONB,
  ADD COLUMN IF NOT EXISTS resolved BOOLEAN,
  ADD COLUMN IF NOT EXISTS resolved_by UUID,
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.system_delivery_breaches
SET related_session_id = COALESCE(related_session_id, session_id,
      CASE WHEN entity_type = 'session' THEN entity_id ELSE NULL END),
    related_user_id = COALESCE(related_user_id,
      CASE WHEN entity_type = 'user' THEN entity_id ELSE NULL END),
    related_patient_id = COALESCE(related_patient_id,
      CASE WHEN entity_type = 'patient' THEN entity_id ELSE NULL END),
    breach_details = COALESCE(
      breach_details,
      jsonb_strip_nulls(jsonb_build_object(
        'description', description,
        'impact', impact,
        'root_cause', root_cause,
        'resolution', resolution
      )),
      '{}'::jsonb
    ),
    resolved = COALESCE(resolved, status IN ('resolved', 'closed')),
    resolution_notes = COALESCE(resolution_notes, resolution),
    updated_at = COALESCE(updated_at, NOW())
WHERE related_session_id IS NULL
   OR related_user_id IS NULL
   OR related_patient_id IS NULL
   OR breach_details IS NULL
   OR resolved IS NULL
   OR (resolution_notes IS NULL AND resolution IS NOT NULL);

ALTER TABLE public.system_delivery_breaches
  ALTER COLUMN breach_details SET DEFAULT '{}'::jsonb,
  ALTER COLUMN breach_details SET NOT NULL,
  ALTER COLUMN resolved SET DEFAULT FALSE,
  ALTER COLUMN updated_at SET DEFAULT NOW();

-- Tenant health-score snapshots: expose the daily scores consumed by platform UI.
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
SET score_date = COALESCE(score_date, calculated_at::date, CURRENT_DATE),
    login_frequency_score = COALESCE(login_frequency_score, 0),
    activity_score = COALESCE(activity_score, quality_score, 0),
    patient_growth_score = COALESCE(patient_growth_score, growth_score, 0),
    feature_adoption_score = COALESCE(feature_adoption_score, reliability_score, 0),
    revenue_trend_score = COALESCE(revenue_trend_score, financial_health_score, 0),
    score_details = COALESCE(score_details, metadata, '{}'::jsonb)
WHERE score_date IS NULL
   OR login_frequency_score IS NULL
   OR activity_score IS NULL
   OR patient_growth_score IS NULL
   OR feature_adoption_score IS NULL
   OR revenue_trend_score IS NULL
   OR score_details IS NULL;

ALTER TABLE public.tenant_health_scores
  ALTER COLUMN score_date SET DEFAULT CURRENT_DATE,
  ALTER COLUMN score_date SET NOT NULL,
  ALTER COLUMN login_frequency_score SET DEFAULT 0,
  ALTER COLUMN activity_score SET DEFAULT 0,
  ALTER COLUMN patient_growth_score SET DEFAULT 0,
  ALTER COLUMN feature_adoption_score SET DEFAULT 0,
  ALTER COLUMN revenue_trend_score SET DEFAULT 0,
  ALTER COLUMN score_details SET DEFAULT '{}'::jsonb;

-- Invoice read models expect dates and subunit fields, not just the original
-- issued_at/fils representation.
ALTER TABLE public.clinic_invoices
  ADD COLUMN IF NOT EXISTS invoice_date DATE,
  ADD COLUMN IF NOT EXISTS invoice_status VARCHAR(30),
  ADD COLUMN IF NOT EXISTS subtotal_subunits INTEGER,
  ADD COLUMN IF NOT EXISTS tax_subunits INTEGER,
  ADD COLUMN IF NOT EXISTS discount_subunits INTEGER,
  ADD COLUMN IF NOT EXISTS total_subunits INTEGER,
  ADD COLUMN IF NOT EXISTS amount_paid_subunits INTEGER,
  ADD COLUMN IF NOT EXISTS amount_due_subunits INTEGER,
  ADD COLUMN IF NOT EXISTS collected_reception BOOLEAN,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.clinic_invoices
SET invoice_date = COALESCE(invoice_date, issued_at::date, created_at::date, CURRENT_DATE),
    invoice_status = COALESCE(invoice_status,
      CASE status
        WHEN 'issued' THEN 'issued'
        WHEN 'partial' THEN 'partial'
        WHEN 'paid' THEN 'paid'
        WHEN 'overdue' THEN 'overdue'
        WHEN 'cancelled' THEN 'cancelled'
        WHEN 'refunded' THEN 'refunded'
        ELSE 'draft'
      END),
    subtotal_subunits = COALESCE(subtotal_subunits, subtotal_fils, 0),
    tax_subunits = COALESCE(tax_subunits, tax_fils, 0),
    discount_subunits = COALESCE(discount_subunits, discount_fils, 0),
    total_subunits = COALESCE(total_subunits, total_fils, 0),
    amount_paid_subunits = COALESCE(amount_paid_subunits, paid_fils, 0),
    amount_due_subunits = COALESCE(amount_due_subunits, balance_fils, 0),
    collected_reception = COALESCE(collected_reception, FALSE),
    updated_at = COALESCE(updated_at, NOW())
WHERE invoice_date IS NULL
   OR invoice_status IS NULL
   OR subtotal_subunits IS NULL
   OR tax_subunits IS NULL
   OR discount_subunits IS NULL
   OR total_subunits IS NULL
   OR amount_paid_subunits IS NULL
   OR amount_due_subunits IS NULL
   OR collected_reception IS NULL;

ALTER TABLE public.clinic_invoices
  ALTER COLUMN invoice_date SET DEFAULT CURRENT_DATE,
  ALTER COLUMN invoice_date SET NOT NULL,
  ALTER COLUMN invoice_status SET DEFAULT 'draft',
  ALTER COLUMN subtotal_subunits SET DEFAULT 0,
  ALTER COLUMN tax_subunits SET DEFAULT 0,
  ALTER COLUMN discount_subunits SET DEFAULT 0,
  ALTER COLUMN total_subunits SET DEFAULT 0,
  ALTER COLUMN amount_paid_subunits SET DEFAULT 0,
  ALTER COLUMN collected_reception SET DEFAULT FALSE,
  ALTER COLUMN updated_at SET DEFAULT NOW();

-- Room directory modern names/types coexist with the original name/code columns.
ALTER TABLE public.clinic_rooms
  ADD COLUMN IF NOT EXISTS room_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS room_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS floor_number SMALLINT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE public.clinic_rooms
SET room_name = COALESCE(room_name, NULLIF(name, ''), NULLIF(code, ''), 'Room ' || LEFT(id::text, 8)),
    room_type = COALESCE(room_type, 'consultation'),
    floor_number = COALESCE(floor_number, 1)
WHERE room_name IS NULL OR room_type IS NULL OR floor_number IS NULL;

ALTER TABLE public.clinic_rooms
  ALTER COLUMN room_name SET NOT NULL,
  ALTER COLUMN room_type SET NOT NULL,
  ALTER COLUMN floor_number SET DEFAULT 1;

-- The longitudinal profile table started as a vitals history table; add the
-- profile/loyalty metrics consumed by the patient directory and Doctor RPC.
ALTER TABLE public.patient_longitudinal_profiles
  ADD COLUMN IF NOT EXISTS total_visits INTEGER,
  ADD COLUMN IF NOT EXISTS total_completed_visits INTEGER,
  ADD COLUMN IF NOT EXISTS total_no_shows INTEGER,
  ADD COLUMN IF NOT EXISTS total_cancellations INTEGER,
  ADD COLUMN IF NOT EXISTS total_revenue_subunits BIGINT,
  ADD COLUMN IF NOT EXISTS last_visit_date DATE,
  ADD COLUMN IF NOT EXISTS next_scheduled_visit DATE,
  ADD COLUMN IF NOT EXISTS loyalty_tier VARCHAR(30),
  ADD COLUMN IF NOT EXISTS dominant_disc_profile VARCHAR(50),
  ADD COLUMN IF NOT EXISTS profile_version INTEGER,
  ADD COLUMN IF NOT EXISTS last_calculated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS historical_core_score_avg SMALLINT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.patient_longitudinal_profiles lp
SET total_visits = COALESCE(lp.total_visits, lp.total_completed_visits, 0),
    total_completed_visits = COALESCE(lp.total_completed_visits, lp.total_visits, 0),
    total_no_shows = COALESCE(lp.total_no_shows, 0),
    total_cancellations = COALESCE(lp.total_cancellations, 0),
    total_revenue_subunits = COALESCE(lp.total_revenue_subunits, 0),
    loyalty_tier = COALESCE(lp.loyalty_tier, 'standard'),
    dominant_disc_profile = COALESCE(lp.dominant_disc_profile, p.dominant_disc_profile),
    profile_version = COALESCE(lp.profile_version, 1),
    last_calculated_at = COALESCE(lp.last_calculated_at, lp.updated_at, lp.created_at, NOW()),
    historical_core_score_avg = COALESCE(lp.historical_core_score_avg, 0),
    updated_at = COALESCE(lp.updated_at, lp.created_at, NOW())
FROM public.clinic_patients p
WHERE p.id = lp.patient_id
  AND (
    lp.total_visits IS NULL
    OR lp.total_completed_visits IS NULL
    OR lp.total_no_shows IS NULL
    OR lp.total_cancellations IS NULL
    OR lp.total_revenue_subunits IS NULL
    OR lp.loyalty_tier IS NULL
    OR lp.dominant_disc_profile IS NULL
    OR lp.profile_version IS NULL
    OR lp.last_calculated_at IS NULL
    OR lp.historical_core_score_avg IS NULL
    OR lp.updated_at IS NULL
  );

UPDATE public.patient_longitudinal_profiles
SET total_visits = COALESCE(total_visits, total_completed_visits, 0),
    total_completed_visits = COALESCE(total_completed_visits, total_visits, 0),
    total_no_shows = COALESCE(total_no_shows, 0),
    total_cancellations = COALESCE(total_cancellations, 0),
    total_revenue_subunits = COALESCE(total_revenue_subunits, 0),
    loyalty_tier = COALESCE(loyalty_tier, 'standard'),
    profile_version = COALESCE(profile_version, 1),
    last_calculated_at = COALESCE(last_calculated_at, created_at, NOW()),
    historical_core_score_avg = COALESCE(historical_core_score_avg, 0),
    updated_at = COALESCE(updated_at, created_at, NOW())
WHERE total_visits IS NULL
   OR total_completed_visits IS NULL
   OR total_no_shows IS NULL
   OR total_cancellations IS NULL
   OR total_revenue_subunits IS NULL
   OR loyalty_tier IS NULL
   OR profile_version IS NULL
   OR last_calculated_at IS NULL
   OR historical_core_score_avg IS NULL
   OR updated_at IS NULL;

ALTER TABLE public.patient_longitudinal_profiles
  ALTER COLUMN total_visits SET DEFAULT 0,
  ALTER COLUMN total_completed_visits SET DEFAULT 0,
  ALTER COLUMN total_no_shows SET DEFAULT 0,
  ALTER COLUMN total_cancellations SET DEFAULT 0,
  ALTER COLUMN total_revenue_subunits SET DEFAULT 0,
  ALTER COLUMN loyalty_tier SET DEFAULT 'standard',
  ALTER COLUMN profile_version SET DEFAULT 1,
  ALTER COLUMN last_calculated_at SET DEFAULT NOW(),
  ALTER COLUMN historical_core_score_avg SET DEFAULT 0,
  ALTER COLUMN updated_at SET DEFAULT NOW();

-- Modern inventory ledger columns coexist with legacy item/cost transactions.
ALTER TABLE public.inventory_ledger
  ADD COLUMN IF NOT EXISTS material_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS quantity_consumed NUMERIC,
  ADD COLUMN IF NOT EXISTS consumption_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS logged_by UUID,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.inventory_ledger
SET material_name = COALESCE(material_name, NULLIF(item_name, ''), NULLIF(item_code, ''), 'Unknown material'),
    quantity_consumed = COALESCE(quantity_consumed, quantity::numeric, 0),
    consumption_type = COALESCE(consumption_type, NULLIF(transaction_type, ''), 'adjustment'),
    logged_by = COALESCE(logged_by, performed_by),
    updated_at = COALESCE(updated_at, created_at, NOW())
WHERE material_name IS NULL
   OR quantity_consumed IS NULL
   OR consumption_type IS NULL
   OR (logged_by IS NULL AND performed_by IS NOT NULL)
   OR updated_at IS NULL;

ALTER TABLE public.inventory_ledger
  ALTER COLUMN material_name SET NOT NULL,
  ALTER COLUMN quantity_consumed SET NOT NULL,
  ALTER COLUMN consumption_type SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT NOW();

-- Audit UI columns are aliases over the original actor/entity fields.
ALTER TABLE public.audit_trail
  ADD COLUMN IF NOT EXISTS actor_id UUID,
  ADD COLUMN IF NOT EXISTS actor_role VARCHAR(50),
  ADD COLUMN IF NOT EXISTS table_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS record_id UUID,
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS session_token VARCHAR(255),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.audit_trail
SET actor_id = COALESCE(actor_id, user_id),
    actor_role = COALESCE(actor_role, actor_type),
    table_name = COALESCE(table_name, entity_type),
    record_id = COALESCE(record_id, entity_id),
    reason = COALESCE(reason, metadata->>'reason'),
    updated_at = COALESCE(updated_at, created_at, NOW())
WHERE actor_id IS NULL
   OR actor_role IS NULL
   OR table_name IS NULL
   OR record_id IS NULL
   OR reason IS NULL
   OR updated_at IS NULL;

ALTER TABLE public.audit_trail
  ALTER COLUMN updated_at SET DEFAULT NOW();

-- Inquiry RPCs use modern columns while legacy table constraints require the
-- patient_name/patient_phone aliases. Keep both shapes in sync at the boundary.
ALTER TABLE public.clinic_inquiries
  ADD COLUMN IF NOT EXISTS temp_patient_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS temp_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS inquiry_reason VARCHAR(1000),
  ADD COLUMN IF NOT EXISTS procedures_requested TEXT[],
  ADD COLUMN IF NOT EXISTS initial_disc_guess VARCHAR(50),
  ADD COLUMN IF NOT EXISTS expected_objection VARCHAR(100),
  ADD COLUMN IF NOT EXISTS handled_by UUID,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE public.clinic_inquiries
SET temp_patient_name = COALESCE(temp_patient_name, patient_name),
    temp_phone = COALESCE(temp_phone, patient_phone),
    inquiry_reason = COALESCE(inquiry_reason, notes),
    procedures_requested = COALESCE(procedures_requested,
      CASE WHEN procedure_id IS NULL THEN NULL ELSE ARRAY[procedure_id::text] END),
    handled_by = COALESCE(handled_by, assigned_to)
WHERE temp_patient_name IS NULL
   OR temp_phone IS NULL
   OR inquiry_reason IS NULL
   OR procedures_requested IS NULL
   OR handled_by IS NULL;

DO $p152_inquiry_constraints$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.clinic_inquiries'::regclass AND conname='clinic_inquiries_type_check') THEN
    ALTER TABLE public.clinic_inquiries DROP CONSTRAINT clinic_inquiries_type_check;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.clinic_inquiries'::regclass AND conname='clinic_inquiries_status_check') THEN
    ALTER TABLE public.clinic_inquiries DROP CONSTRAINT clinic_inquiries_status_check;
  END IF;
  ALTER TABLE public.clinic_inquiries
    ADD CONSTRAINT clinic_inquiries_type_check
      CHECK (inquiry_type IN ('appointment','information','emergency','follow_up','other','walk_in','callback','online')),
    ADD CONSTRAINT clinic_inquiries_status_check
      CHECK (status IN ('pending','contacted','scheduled','cancelled','closed','converted_to_session','rescheduled','no_show'));
END;
$p152_inquiry_constraints$;

CREATE OR REPLACE FUNCTION public.sync_clinic_inquiry_schema_aliases()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.temp_patient_name := COALESCE(NEW.temp_patient_name, NEW.patient_name);
    NEW.patient_name := COALESCE(NEW.patient_name, NEW.temp_patient_name);
    NEW.temp_phone := COALESCE(NEW.temp_phone, NEW.patient_phone);
    NEW.patient_phone := COALESCE(NEW.patient_phone, NEW.temp_phone);
    NEW.inquiry_reason := COALESCE(NEW.inquiry_reason, NEW.notes);
    NEW.notes := COALESCE(NEW.notes, NEW.inquiry_reason);
    NEW.handled_by := COALESCE(NEW.handled_by, NEW.assigned_to);
    NEW.assigned_to := COALESCE(NEW.assigned_to, NEW.handled_by);
  ELSE
    IF NEW.temp_patient_name IS DISTINCT FROM OLD.temp_patient_name THEN
      NEW.patient_name := COALESCE(NEW.temp_patient_name, NEW.patient_name);
    ELSIF NEW.patient_name IS DISTINCT FROM OLD.patient_name THEN
      NEW.temp_patient_name := COALESCE(NEW.patient_name, NEW.temp_patient_name);
    END IF;
    IF NEW.temp_phone IS DISTINCT FROM OLD.temp_phone THEN
      NEW.patient_phone := COALESCE(NEW.temp_phone, NEW.patient_phone);
    ELSIF NEW.patient_phone IS DISTINCT FROM OLD.patient_phone THEN
      NEW.temp_phone := COALESCE(NEW.patient_phone, NEW.temp_phone);
    END IF;
    IF NEW.inquiry_reason IS DISTINCT FROM OLD.inquiry_reason THEN
      NEW.notes := COALESCE(NEW.inquiry_reason, NEW.notes);
    ELSIF NEW.notes IS DISTINCT FROM OLD.notes THEN
      NEW.inquiry_reason := COALESCE(NEW.notes, NEW.inquiry_reason);
    END IF;
    IF NEW.handled_by IS DISTINCT FROM OLD.handled_by THEN
      NEW.assigned_to := COALESCE(NEW.handled_by, NEW.assigned_to);
    ELSIF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      NEW.handled_by := COALESCE(NEW.assigned_to, NEW.handled_by);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_clinic_inquiry_schema_aliases ON public.clinic_inquiries;
CREATE TRIGGER trg_sync_clinic_inquiry_schema_aliases
BEFORE INSERT OR UPDATE ON public.clinic_inquiries
FOR EACH ROW EXECUTE FUNCTION public.sync_clinic_inquiry_schema_aliases();
