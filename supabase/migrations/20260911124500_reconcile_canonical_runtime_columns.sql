-- CORE SYSTEM v2.1 — canonical runtime column reconciliation
-- Evidence basis: Production information_schema + active UI/database.types contracts.
-- Scope: restore columns already present in Production/current contract during isolated migration replay.
-- No table redesign, no auth/RLS contract change, no archive change.

-- Patient registry: canonical phone/name fields used by active Doctor/Admin/Reception surfaces.
ALTER TABLE public.clinic_patients
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS first_name_ar text,
  ADD COLUMN IF NOT EXISTS last_name_ar text,
  ADD COLUMN IF NOT EXISTS father_name text,
  ADD COLUMN IF NOT EXISTS father_name_ar text,
  ADD COLUMN IF NOT EXISTS phone_primary text,
  ADD COLUMN IF NOT EXISTS phone_secondary varchar(20),
  ADD COLUMN IF NOT EXISTS preferred_channel varchar(20),
  ADD COLUMN IF NOT EXISTS first_visit_date date,
  ADD COLUMN IF NOT EXISTS referral_source varchar(100),
  ADD COLUMN IF NOT EXISTS patient_status varchar(30),
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS core_score_display numeric;

UPDATE public.clinic_patients
SET phone_primary = COALESCE(phone_primary, phone),
    full_name = COALESCE(NULLIF(full_name, ''), trim(concat_ws(' ', first_name, last_name)))
WHERE phone_primary IS NULL OR full_name IS NULL OR full_name = '';

-- Longitudinal patient profile fields used by Admin Patients and Reception booking flows.
ALTER TABLE public.patient_longitudinal_profiles
  ADD COLUMN IF NOT EXISTS historical_aps_avg smallint,
  ADD COLUMN IF NOT EXISTS historical_dri_avg smallint,
  ADD COLUMN IF NOT EXISTS historical_tsi_avg smallint,
  ADD COLUMN IF NOT EXISTS historical_uri_avg smallint,
  ADD COLUMN IF NOT EXISTS historical_pqs_avg smallint,
  ADD COLUMN IF NOT EXISTS historical_rvs_avg smallint,
  ADD COLUMN IF NOT EXISTS historical_core_score_avg smallint,
  ADD COLUMN IF NOT EXISTS total_visits integer,
  ADD COLUMN IF NOT EXISTS total_completed_visits integer,
  ADD COLUMN IF NOT EXISTS total_no_shows integer,
  ADD COLUMN IF NOT EXISTS total_cancellations integer,
  ADD COLUMN IF NOT EXISTS total_revenue_subunits bigint,
  ADD COLUMN IF NOT EXISTS last_visit_date date,
  ADD COLUMN IF NOT EXISTS next_scheduled_visit date,
  ADD COLUMN IF NOT EXISTS loyalty_tier varchar(20),
  ADD COLUMN IF NOT EXISTS dominant_disc_profile varchar(20),
  ADD COLUMN IF NOT EXISTS profile_version integer,
  ADD COLUMN IF NOT EXISTS last_calculated_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Rooms: active schedule reads include soft-delete filtering.
ALTER TABLE public.clinic_rooms
  ADD COLUMN IF NOT EXISTS room_name varchar(100),
  ADD COLUMN IF NOT EXISTS room_type varchar(50),
  ADD COLUMN IF NOT EXISTS floor_number smallint,
  ADD COLUMN IF NOT EXISTS capacity smallint,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Invoices: canonical date/soft-delete contract used by Admin Revenue + Reception Invoices.
ALTER TABLE public.clinic_invoices
  ADD COLUMN IF NOT EXISTS invoice_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Inventory: canonical operational ledger contract used by Admin Inventory.
ALTER TABLE public.inventory_ledger
  ADD COLUMN IF NOT EXISTS material_name varchar(150),
  ADD COLUMN IF NOT EXISTS quantity_consumed numeric(10,2),
  ADD COLUMN IF NOT EXISTS consumption_type varchar(50),
  ADD COLUMN IF NOT EXISTS logged_by uuid REFERENCES public.clinic_users(id),
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.clinic_visit_sessions(id),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Core rules: tenant-scoped rule configuration already confirmed in Production.
ALTER TABLE public.core_rules_config
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.master_tenants(id),
  ADD COLUMN IF NOT EXISTS rule_category varchar(50),
  ADD COLUMN IF NOT EXISTS rule_key varchar(100),
  ADD COLUMN IF NOT EXISTS rule_name varchar(255),
  ADD COLUMN IF NOT EXISTS rule_value jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_overridable boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Tenant health score contract used by Super Admin Health Scores.
ALTER TABLE public.tenant_health_scores
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.master_tenants(id),
  ADD COLUMN IF NOT EXISTS score_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS overall_score smallint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS login_frequency_score smallint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS activity_score smallint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS patient_growth_score smallint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS feature_adoption_score smallint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue_trend_score smallint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_details jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Delivery breach contract used by Super Admin Alerts/Breaches.
ALTER TABLE public.system_delivery_breaches
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.master_tenants(id),
  ADD COLUMN IF NOT EXISTS related_session_id uuid REFERENCES public.clinic_visit_sessions(id),
  ADD COLUMN IF NOT EXISTS related_user_id uuid REFERENCES public.clinic_users(id),
  ADD COLUMN IF NOT EXISTS related_patient_id uuid REFERENCES public.clinic_patients(id),
  ADD COLUMN IF NOT EXISTS breach_details jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS resolved boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES public.clinic_users(id),
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolution_notes text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Reception inquiries are soft-deleted and expose the pre-registration fields.
ALTER TABLE public.clinic_inquiries
  ADD COLUMN IF NOT EXISTS temp_patient_name varchar(255),
  ADD COLUMN IF NOT EXISTS temp_phone varchar(20),
  ADD COLUMN IF NOT EXISTS inquiry_reason varchar(255),
  ADD COLUMN IF NOT EXISTS procedures_requested text[],
  ADD COLUMN IF NOT EXISTS initial_disc_guess varchar(20),
  ADD COLUMN IF NOT EXISTS expected_objection varchar(50),
  ADD COLUMN IF NOT EXISTS status varchar(30) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS handled_by uuid REFERENCES public.clinic_users(id),
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Queue fields used by both active Doctor and Reception surfaces.
ALTER TABLE public.clinic_visit_sessions
  ADD COLUMN IF NOT EXISTS queue_position integer,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Audit trail runtime contract confirmed in Production, including soft-delete metadata added by later repairs.
ALTER TABLE public.audit_trail
  ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES public.clinic_users(id),
  ADD COLUMN IF NOT EXISTS actor_role varchar(50),
  ADD COLUMN IF NOT EXISTS action varchar(100),
  ADD COLUMN IF NOT EXISTS table_name varchar(100),
  ADD COLUMN IF NOT EXISTS record_id uuid,
  ADD COLUMN IF NOT EXISTS old_values jsonb,
  ADD COLUMN IF NOT EXISTS new_values jsonb,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS ip_address inet,
  ADD COLUMN IF NOT EXISTS session_token varchar(255),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Production-compatible indexes used by the active runtime.
CREATE INDEX IF NOT EXISTS idx_clinic_patients_phone_primary
  ON public.clinic_patients (tenant_id, phone_primary);
CREATE INDEX IF NOT EXISTS idx_patient_longitudinal_profiles_tenant_patient
  ON public.patient_longitudinal_profiles (tenant_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_clinic_visit_sessions_queue_position
  ON public.clinic_visit_sessions (tenant_id, queue_position);
