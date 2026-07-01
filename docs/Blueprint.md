# CORE SYSTEM™ — Comprehensive Technical Blueprint
## Engineering Constitution v2.1 Implementation Plan
### Principal Architect Output | June 2026--
## PART 1A — COMPLETE POSTGRESQL DDL SCHEMA
> **Mandatory Engineering Rules (from Constitution v2.1):**
> - Every table: `tenant_id UUID` (absolute isolation)
> - All primary keys: `gen_random_uuid()` UUID v4
> - Soft-delete only: `deleted_at TIMESTAMPTZ` (no physical deletion ever)
> - All financials: `INTEGER` subunits in Fils (1 JOD = 1000 fils) — FLOAT is prohibited
> - All timestamps: `TIMESTAMPTZ` with `Asia/Amman` timezone
> - RLS enabled on every sensitive table--
### SECTION 0 — EXTENSIONS & SETUP
```sql-- ============================================================-- CORE SYSTEM™ v2.1 — Production Database Schema-- PostgreSQL 15 / Supabase-- Intellectual Property: Yazeed Waleed © 2026-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- Required for EXCLUDE constraints
```--
### SECTION 1 — MASTER TENANTS & LICENSING
```sql-- ============================================================-- TABLE 1: master_tenants-- Core licensing and tenant registry — Super Admin controlled-- ============================================================
CREATE TABLE master_tenants (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_name         VARCHAR(255) NOT NULL,
  clinic_name_ar      VARCHAR(255),
  license_key         VARCHAR(100) UNIQUE NOT NULL,
  subscription_tier   VARCHAR(50)  NOT NULL DEFAULT 'trial'
    CHECK (subscription_tier IN ('trial','essential','professional','enterprise','suspended')),
  max_devices         SMALLINT     NOT NULL DEFAULT 2,
  subscription_start  TIMESTAMPTZ,
  subscription_end    TIMESTAMPTZ,
  trial_started_at    TIMESTAMPTZ  DEFAULT NOW(),        -- 14-day trial clock
  timezone            VARCHAR(50)  NOT NULL DEFAULT 'Asia/Amman',
  currency            VARCHAR(10)  NOT NULL DEFAULT 'JOD',
  currency_subunit    INTEGER      NOT NULL DEFAULT 1000,-- 1 JOD = 1000 fils
  logo_url            TEXT,
  primary_color       VARCHAR(7)   DEFAULT '#1B2A4A',
  primary_phone       VARCHAR(20),
  whatsapp_number     VARCHAR(20),
  address             TEXT,
  country_code        VARCHAR(5)   DEFAULT 'JO',
  is_active           BOOLEAN      NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);
CREATE INDEX idx_tenants_license ON master_tenants(license_key)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_tenants_active ON master_tenants(is_active)
  WHERE is_active = true;
CREATE INDEX idx_tenants_tier ON master_tenants(subscription_tier)
  WHERE deleted_at IS NULL;
```--
### SECTION 2 — USERS & STAFF PROFILES
```sql-- ============================================================-- TABLE 2: clinic_users-- Staff accounts linked to Supabase auth.users-- ============================================================
CREATE TABLE clinic_users (
  id              UUID PRIMARY KEY,  -- Mirrors auth.users.id
  tenant_id       UUID NOT NULL REFERENCES master_tenants(id),
  full_name       VARCHAR(255) NOT NULL,
  full_name_ar    VARCHAR(255),
  role            VARCHAR(50) NOT NULL
    CHECK (role IN ('super_admin','clinic_admin','doctor','receptionist')),
  specialization  VARCHAR(100),                    -- Doctors only
  employee_code   VARCHAR(20)  NOT NULL,
  pin_code        VARCHAR(4)   NOT NULL,            -- Encrypted 4-digit PIN for kiosk fast-switch
  phone           VARCHAR(20),
  is_active       BOOLEAN      NOT NULL DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  CONSTRAINT uq_employee_code UNIQUE (tenant_id, employee_code)
);
CREATE INDEX idx_users_tenant ON clinic_users(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role   ON clinic_users(tenant_id, role) WHERE deleted_at IS NULL;
```--
### SECTION 3 — ROOMS & RESOURCES
```sql-- ============================================================-- TABLE 3: clinic_rooms-- ============================================================
CREATE TABLE clinic_rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES master_tenants(id),
  room_name   VARCHAR(100) NOT NULL,
  room_type   VARCHAR(50)  NOT NULL
    CHECK (room_type IN ('consultation','procedure','waiting','reception')),
  floor_number SMALLINT DEFAULT 1,
  capacity     SMALLINT DEFAULT 1,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_rooms_tenant ON clinic_rooms(tenant_id) WHERE is_active = true;
```
--
### SECTION 4 — PROCEDURES & SERVICES
```sql-- ============================================================-- TABLE 4: clinic_procedures-- Catalog of clinical services with time & price definitions-- ============================================================
CREATE TABLE clinic_procedures (
  id                       UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID    NOT NULL REFERENCES master_tenants(id),
  procedure_name           VARCHAR(255) NOT NULL,
  procedure_name_ar        VARCHAR(255),
  category                 VARCHAR(100),
  standard_duration_minutes SMALLINT NOT NULL DEFAULT 30,
  buffer_time_minutes       SMALLINT NOT NULL DEFAULT 10,
  base_price_subunits       INTEGER  NOT NULL DEFAULT 0, -- In fils, no FLOAT
  is_active                 BOOLEAN  NOT NULL DEFAULT true,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_procedures_tenant ON clinic_procedures(tenant_id) WHERE is_active = true;
```--
### SECTION 5 — PATIENT FILES
```sql-- ============================================================-- TABLE 5: clinic_patients-- Core patient registry with DISC-ready behavioral fields-- ============================================================
CREATE TABLE clinic_patients (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES master_tenants(id),
  first_name       VARCHAR(100) NOT NULL,
  last_name        VARCHAR(100) NOT NULL,
  first_name_ar    VARCHAR(100),
  last_name_ar     VARCHAR(100),
  date_of_birth    DATE,
  gender           VARCHAR(10) CHECK (gender IN ('male','female')),
  phone_primary    VARCHAR(20) NOT NULL,
  phone_secondary  VARCHAR(20),
  email            VARCHAR(255),
  preferred_channel VARCHAR(20) DEFAULT 'whatsapp'
    CHECK (preferred_channel IN ('whatsapp','sms','email')),
  first_visit_date DATE,
  referral_source  VARCHAR(100),
  patient_status   VARCHAR(30) DEFAULT 'active'
    CHECK (patient_status IN ('active','inactive','vip','blocked','transferred')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  CONSTRAINT uq_patient_phone UNIQUE (tenant_id, phone_primary)
);
CREATE INDEX idx_patients_tenant ON clinic_patients(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_patients_phone  ON clinic_patients(tenant_id, phone_primary);
CREATE INDEX idx_patients_status ON clinic_patients(tenant_id, patient_status);
```--
### SECTION 6 — LONGITUDINAL LTV PROFILES
```sql-- ============================================================-- TABLE 6: patient_longitudinal_profiles-- Cumulative behavioral history + LTV for 60/40 scoring rule-- ============================================================
CREATE TABLE patient_longitudinal_profiles (
  id                       UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID    NOT NULL REFERENCES master_tenants(id),
  patient_id               UUID    NOT NULL REFERENCES clinic_patients(id),
  -- Six historical indicators (0–1000 scale, backend precision)
  historical_aps_avg       SMALLINT DEFAULT 0 CHECK (historical_aps_avg BETWEEN 0 AND 1000),
  historical_dri_avg       SMALLINT DEFAULT 0 CHECK (historical_dri_avg BETWEEN 0 AND 1000),
  historical_tsi_avg       SMALLINT DEFAULT 0 CHECK (historical_tsi_avg BETWEEN 0 AND 1000),
  historical_uri_avg       SMALLINT DEFAULT 0 CHECK (historical_uri_avg BETWEEN 0 AND 1000),
  historical_pqs_avg       SMALLINT DEFAULT 0 CHECK (historical_pqs_avg BETWEEN 0 AND 1000),
  historical_rvs_avg       SMALLINT DEFAULT 0 CHECK (historical_rvs_avg BETWEEN 0 AND 1000),
  historical_core_score_avg SMALLINT DEFAULT 0 CHECK (historical_core_score_avg BETWEEN 0
AND 1000),
  -- Visit statistics
  total_visits             INTEGER DEFAULT 0,
  total_completed_visits   INTEGER DEFAULT 0,
  total_no_shows           INTEGER DEFAULT 0,
  total_cancellations      INTEGER DEFAULT 0,
  -- Financial LTV (in fils)
  total_revenue_subunits   BIGINT DEFAULT 0,
  -- Loyalty tracking
  last_visit_date          DATE,
  next_scheduled_visit     DATE,
  loyalty_tier             VARCHAR(20) DEFAULT 'standard'
    CHECK (loyalty_tier IN ('standard','silver','gold','vip')),
  -- Computed DISC dominant profile
  dominant_disc_profile    VARCHAR(20)
    CHECK (dominant_disc_profile IN ('driver','influencer','analytical','emotional',NULL)),
  profile_version          INTEGER DEFAULT 1,
  last_calculated_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_longitudinal_profile UNIQUE (tenant_id, patient_id)
);
CREATE INDEX idx_longitudinal_patient    ON patient_longitudinal_profiles(patient_id);
CREATE INDEX idx_longitudinal_score      ON patient_longitudinal_profiles(tenant_id,
historical_core_score_avg DESC);
CREATE INDEX idx_longitudinal_last_visit ON patient_longitudinal_profiles(tenant_id,
last_visit_date);
```--
### SECTION 7 — INQUIRIES & FRONT-LINE
```sql-- ============================================================-- TABLE 7: clinic_inquiries-- First touch: walk-ins, callbacks, online bookings-- ============================================================
CREATE TABLE clinic_inquiries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES master_tenants(id),
  inquiry_type          VARCHAR(30) NOT NULL
    CHECK (inquiry_type IN ('walk_in','appointment','callback','online')),
  patient_id            UUID REFERENCES clinic_patients(id),
  temp_patient_name     VARCHAR(255),                  -- Pre-registration
  temp_phone            VARCHAR(20),
  inquiry_reason        VARCHAR(255),
  procedures_requested  TEXT[],
  initial_disc_guess    VARCHAR(20)
    CHECK (initial_disc_guess IN ('driver','influencer','analytical','emotional',NULL)),
  expected_objection    VARCHAR(50)
    CHECK (expected_objection IN ('price','trust','pain','time','results','safety',NULL)),
  status                VARCHAR(30) DEFAULT 'pending'
    CHECK (status IN ('pending','converted_to_session','cancelled','rescheduled','no_show')),
  handled_by            UUID REFERENCES clinic_users(id),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_inquiries_tenant ON clinic_inquiries(tenant_id, created_at DESC);
CREATE INDEX idx_inquiries_status ON clinic_inquiries(tenant_id, status) WHERE status =
'pending';
```--
### SECTION 8 — CENTRAL CALENDAR / AGENDA
```sql-- ============================================================-- TABLE 8: master_agenda_events-- Central scheduling with GIST-based overlap prevention-- ============================================================
CREATE TABLE master_agenda_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES master_tenants(id),
  patient_id          UUID REFERENCES clinic_patients(id),
  doctor_id           UUID REFERENCES clinic_users(id),
  room_id             UUID REFERENCES clinic_rooms(id),
  procedure_id        UUID REFERENCES clinic_procedures(id),
  inquiry_id          UUID REFERENCES clinic_inquiries(id),
  scheduled_start     TIMESTAMPTZ NOT NULL,
  scheduled_end       TIMESTAMPTZ NOT NULL,
  buffer_end          TIMESTAMPTZ NOT NULL, -- scheduled_end + buffer_time
  event_type          VARCHAR(30) NOT NULL
    CHECK (event_type IN ('appointment','block','break','emergency')),
  visit_type          VARCHAR(20)
    CHECK (visit_type IN ('first_time','follow_up','emergency','consultation')),
  status              VARCHAR(30) DEFAULT 'scheduled'
    CHECK (status IN
('scheduled','confirmed','arrived','in_session','completed','no_show','cancelled','rescheduled')),
  cancellation_reason VARCHAR(100)
    CHECK (cancellation_reason IN
('patient_request','doctor_unavailable','emergency','duplicate','financial','competitor','other',NULL)),
  reminder_sent_24h   BOOLEAN DEFAULT false,
  reminder_sent_2h    BOOLEAN DEFAULT false,
  booking_notes       TEXT,
  created_by          UUID REFERENCES clinic_users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- GIST exclusion constraint: prevents double-booking same doctor at overlapping times
  CONSTRAINT no_doctor_overlap EXCLUDE USING gist (
    doctor_id WITH =,
    tstzrange(scheduled_start, buffer_end) WITH &&
  ) WHERE (status NOT IN ('cancelled','no_show'))
);
CREATE INDEX idx_agenda_tenant_date ON master_agenda_events(tenant_id, scheduled_start);
CREATE INDEX idx_agenda_doctor_date ON master_agenda_events(doctor_id, scheduled_start)
  WHERE status NOT IN ('cancelled','no_show');
CREATE INDEX idx_agenda_patient ON master_agenda_events(patient_id);
```--
### SECTION 9 — LIVE VISIT SESSIONS (v2.1 UPDATED)
```sql-- ============================================================-- TABLE 9: clinic_visit_sessions-- Real-time queue + live locks + behavioral scoring-- v2.1: Added lock governance fields and insurance badge-- ============================================================
CREATE TABLE clinic_visit_sessions (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL REFERENCES master_tenants(id),
  patient_id                  UUID NOT NULL REFERENCES clinic_patients(id),
  doctor_id                   UUID NOT NULL REFERENCES clinic_users(id),
  room_id                     UUID REFERENCES clinic_rooms(id),
  agenda_event_id             UUID REFERENCES master_agenda_events(id),
  -- Lifecycle timestamps
  arrived_at                  TIMESTAMPTZ,         -- Patient physically arrived
  session_started_at          TIMESTAMPTZ,         -- Entered doctor's room
  session_ended_at            TIMESTAMPTZ,         -- Doctor finished examination
  visit_closed_at             TIMESTAMPTZ,         -- Patient fully departed
  -- Live lock governance (v2.1)
  lock_holder_id              UUID REFERENCES clinic_users(id),     -- Staff holding the card
  lock_timestamp              TIMESTAMPTZ,         -- When lock was acquired
  initialized_by_receptionist UUID REFERENCES clinic_users(id),     -- Who opened the session gate
  is_insured                  BOOLEAN NOT NULL DEFAULT false,        -- Visual badge, no insurance tables
  -- Computed wait/duration metrics
  waiting_time_minutes        SMALLINT,            -- arrived_at → session_started_at
  session_duration_minutes    SMALLINT,            -- session_started_at → session_ended_at
  -- Six behavioral indicators (0–1000 backend scale)
  score_aps                   SMALLINT CHECK (score_aps BETWEEN 0 AND 1000),
  score_dri                   SMALLINT CHECK (score_dri BETWEEN 0 AND 1000),
  score_tsi                   SMALLINT CHECK (score_tsi BETWEEN 0 AND 1000),
  score_uri                   SMALLINT CHECK (score_uri BETWEEN 0 AND 1000),
  score_pqs                   SMALLINT CHECK (score_pqs BETWEEN 0 AND 1000),
  score_rvs                   SMALLINT CHECK (score_rvs BETWEEN 0 AND 1000),
  -- Computed CORE Score
  core_score_backend          SMALLINT CHECK (core_score_backend BETWEEN 0 AND 1000),
  core_score_display          NUMERIC(5,1) CHECK (core_score_display BETWEEN 0 AND 100), --
backend/10
  -- Patient classification
  patient_class               VARCHAR(20)
    CHECK (patient_class IN ('low_priority','medium_priority','high_priority','qualified','hot_lead')),
  scoring_mode                VARCHAR(20) DEFAULT 'first_time'
    CHECK (scoring_mode IN ('first_time','weighted_ltv')),
  -- Doctor's acceptance decision
  par_result                  VARCHAR(30)
    CHECK (par_result IN
('full_acceptance','partial_acceptance','deferred','rejection','no_decision',NULL)),
  doctor_notes                TEXT,
  -- Session status state machine
  session_status              VARCHAR(30) NOT NULL DEFAULT 'waiting'
    CHECK (session_status IN
('waiting','in_consultation','pending_close','auto_closed','completed','cancelled','System_Closed_Timeout')),
  -- Integrity filters
  prestige_inflation_detected BOOLEAN DEFAULT false,
  prestige_inflation_factor   NUMERIC(4,3) DEFAULT 1.000,
  triangulation_verified      BOOLEAN DEFAULT false,
  -- Auto-management windows
  buffer_window_expires_at    TIMESTAMPTZ,         -- session_ended_at + 5 min
  auto_close_at               TIMESTAMPTZ,         -- visit_closed_at + 60 min
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sessions_tenant  ON clinic_visit_sessions(tenant_id);
CREATE INDEX idx_sessions_patient ON clinic_visit_sessions(patient_id);
CREATE INDEX idx_sessions_doctor  ON clinic_visit_sessions(doctor_id);
CREATE INDEX idx_sessions_status  ON clinic_visit_sessions(tenant_id, session_status)
  WHERE session_status NOT IN ('completed','cancelled');
CREATE INDEX idx_sessions_created ON clinic_visit_sessions(tenant_id, created_at DESC);
```--
### SECTION 10 — INVOICES & FINANCIAL (v2.1 UPDATED)
```sql-- ============================================================-- TABLE 10: clinic_invoices-- Financial ledger — doctors CANNOT access (RLS enforced)-- Triangulation contract: doctor + receptionist + payment-- ============================================================
CREATE TABLE clinic_invoices (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES master_tenants(id),
  session_id              UUID NOT NULL REFERENCES clinic_visit_sessions(id),
  patient_id              UUID NOT NULL REFERENCES clinic_patients(id),
  -- All amounts in fils (subunits) — FLOAT is architecture-prohibited
  subtotal_subunits       INTEGER NOT NULL DEFAULT 0,
  discount_subunits       INTEGER NOT NULL DEFAULT 0,
  discount_reason         VARCHAR(100),
  discount_approved_by    UUID REFERENCES clinic_users(id),
  tax_subunits            INTEGER NOT NULL DEFAULT 0,
  total_subunits          INTEGER NOT NULL DEFAULT 0,
  amount_paid_subunits    INTEGER NOT NULL DEFAULT 0,
  amount_due_subunits     INTEGER GENERATED ALWAYS AS (total_subunits 
amount_paid_subunits) STORED,
  payment_method          VARCHAR(30)
    CHECK (payment_method IN
('cash','card_visa','card_mastercard','bank_transfer','installment','mixed',NULL)),
  invoice_status          VARCHAR(20) DEFAULT 'draft'
    CHECK (invoice_status IN ('draft','issued','paid','partial','cancelled','refunded')),
  -- Triangulation contract columns
  doctor_par_confirmed    BOOLEAN DEFAULT false,   -- Doctor confirmed acceptance
  collected_reception     BOOLEAN DEFAULT false,   -- Receptionist collected cash
  match_triangulation     BOOLEAN DEFAULT false,   -- Auto-computed match
  -- Collected by
  collected_by            UUID REFERENCES clinic_users(id),
  invoice_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- ARCHITECTURAL NOTE: No insurance sub-tables. Use is_insured badge on sessions.
);
CREATE INDEX idx_invoices_session ON clinic_invoices(session_id);
CREATE INDEX idx_invoices_patient ON clinic_invoices(patient_id);
CREATE INDEX idx_invoices_status  ON clinic_invoices(tenant_id, invoice_status);
CREATE INDEX idx_invoices_date    ON clinic_invoices(tenant_id, invoice_date DESC);
```--
### SECTION 11 — INVENTORY LEDGER (v2.1 UPDATED)
```sql-- ============================================================-- TABLE 11: inventory_ledger-- Material consumption + operational waste tracking-- ============================================================
CREATE TABLE inventory_ledger (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES master_tenants(id),
  procedure_id      UUID REFERENCES clinic_procedures(id),
  material_name     VARCHAR(150) NOT NULL,
  quantity_consumed NUMERIC(10,2) NOT NULL,
  consumption_type  VARCHAR(50) NOT NULL
    CHECK (consumption_type IN ('Standard_Clinical','Operational_Waste')),
  logged_by         UUID REFERENCES clinic_users(id),
  session_id        UUID REFERENCES clinic_visit_sessions(id),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_inventory_tenant    ON inventory_ledger(tenant_id, created_at DESC);
CREATE INDEX idx_inventory_procedure ON inventory_ledger(procedure_id);
```--
### SECTION 12 — RETENTION & FOLLOW-UPS
```sql-- ============================================================-- TABLE 12: retention_followups-- Automated + manual follow-up pipeline for churn prevention-- ============================================================
CREATE TABLE retention_followups (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES master_tenants(id),
  patient_id         UUID NOT NULL REFERENCES clinic_patients(id),
  session_id         UUID REFERENCES clinic_visit_sessions(id),
  scheduled_for      TIMESTAMPTZ NOT NULL,
  followup_type      VARCHAR(50) NOT NULL
    CHECK (followup_type IN (
      'post_visit_24h','post_visit_7d',
      'reactivation_30d','reactivation_60d','reactivation_90d',
      'appointment_reminder_24h','appointment_reminder_2h',
      'birthday','custom'
    )),
  channel            VARCHAR(20) DEFAULT 'whatsapp'
    CHECK (channel IN ('whatsapp','sms','email','call')),
  message_template_id UUID,
  message_body       TEXT,
  delivery_status    VARCHAR(20) DEFAULT 'pending'
    CHECK (delivery_status IN ('pending','sent','delivered','read','failed','cancelled')),
  sent_at            TIMESTAMPTZ,
  delivered_at       TIMESTAMPTZ,
  response_received  BOOLEAN DEFAULT false,
  response_text      TEXT,
  sent_by            UUID REFERENCES clinic_users(id), -- NULL = automated
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_followups_scheduled ON retention_followups(tenant_id, scheduled_for)
  WHERE delivery_status = 'pending';
```--
### SECTION 13 — PATIENT INTAKE SURVEYS (5-Page Pipeline)
```sql-- ============================================================-- TABLE 13: patient_intake_responses-- Three-station survey pipeline feeding scoring engine-- ============================================================
CREATE TABLE patient_intake_responses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES master_tenants(id),
  session_id            UUID REFERENCES clinic_visit_sessions(id),
  patient_id            UUID NOT NULL REFERENCES clinic_patients(id),
  -- Page 1: Identity
  visit_type_selection  VARCHAR(20) CHECK (visit_type_selection IN ('first_time','returning')),
  service_reason        VARCHAR(255),
  procedures_requested  TEXT[],
  consent_accepted      BOOLEAN DEFAULT false,
  consent_timestamp     TIMESTAMPTZ,
  -- Page 2: Clinical Intent
  service_interest      VARCHAR(100),
  visit_goal            VARCHAR(100),
  consideration_period  VARCHAR(50),
  -- Page 3: Behavioral Indicators
  readiness_level       SMALLINT CHECK (readiness_level BETWEEN 1 AND 5),  -- → DRI
  decision_factor       VARCHAR(50),
  referral_source       VARCHAR(50),
  followup_importance   SMALLINT CHECK (followup_importance BETWEEN 1 AND 4), -- →
RVS+URI
  -- Page 4: Expectations & Concerns
  top_priorities        TEXT[],                   -- Up to 2 choices
  main_concern          VARCHAR(50),              -- → TSI/PQS
  openness_to_proceed   SMALLINT CHECK (openness_to_proceed BETWEEN 1 AND 3), -- →
URI+APS
  -- Page 5: Conversion
  digital_signature_svg TEXT,                    -- SVG path data
  signature_timestamp   TIMESTAMPTZ,
  whatsapp_redirect_sent BOOLEAN DEFAULT false,
  -- Completion tracking
  completion_status     VARCHAR(20) DEFAULT 'incomplete'
    CHECK (completion_status IN
('incomplete','page1_done','page2_done','page3_done','page4_done','completed')),
  ip_address            INET,
  user_agent            TEXT,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_surveys_session ON patient_intake_responses(session_id);
CREATE INDEX idx_surveys_patient ON patient_intake_responses(patient_id);
```--
### SECTION 14 — BREACH & DELIVERY VIOLATIONS
```sql-- ============================================================-- TABLE 14: system_delivery_breaches-- SLA violations, ghost evaluations, operational negligence-- ============================================================
CREATE TABLE system_delivery_breaches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES master_tenants(id),
  breach_type         VARCHAR(50) NOT NULL
    CHECK (breach_type IN (
      'sla_wait_time','ghost_evaluation','prestige_inflation',
      'triangulation_mismatch','auto_session_close',
      'delivery_failure','offline_duration',
      'Operational_Negligence_Lock_Abandonment'
    )),
  severity            VARCHAR(10) NOT NULL CHECK (severity IN ('info','warning','critical')),
  related_session_id  UUID REFERENCES clinic_visit_sessions(id),
  related_user_id     UUID REFERENCES clinic_users(id),
  related_patient_id  UUID REFERENCES clinic_patients(id),
  breach_details      JSONB NOT NULL DEFAULT '{}',
  resolved            BOOLEAN DEFAULT false,
  resolved_by         UUID REFERENCES clinic_users(id),
  resolved_at         TIMESTAMPTZ,
  resolution_notes    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_breaches_tenant     ON system_delivery_breaches(tenant_id, created_at DESC);
CREATE INDEX idx_breaches_unresolved ON system_delivery_breaches(tenant_id, severity)
  WHERE resolved = false;
```--
### SECTION 15 — IMMUTABLE AUDIT TRAIL
```sql-- ============================================================-- TABLE 15: audit_trail-- Immutable record: Who, What, When, Before, After, IP, Device-- No physical deletion ever permitted on this table-- ============================================================
CREATE TABLE audit_trail (
id          
UUID PRIMARY KEY DEFAULT gen_random_uuid(),
tenant_id   UUID NOT NULL REFERENCES master_tenants(id),
actor_id    UUID REFERENCES clinic_users(id),
actor_role  VARCHAR(50),
action      
VARCHAR(100) NOT NULL,  -- 'UPDATE','DELETE','OVERRIDE','LOGIN','TIER_CHANGE'
table_name  VARCHAR(100) NOT NULL,
record_id   UUID,
old_values  JSONB,
new_values  JSONB,
reason      TEXT,
ip_address  INET,
session_token VARCHAR(255),
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()-- NOTE: No updated_at, no deleted_at — this table is append-only by design
);
CREATE INDEX idx_audit_tenant ON audit_trail(tenant_id, created_at DESC);
CREATE INDEX idx_audit_actor  ON audit_trail(actor_id, created_at DESC);
CREATE INDEX idx_audit_table  ON audit_trail(table_name, record_id);
```--
### SECTION 16 — DEVICE MANAGEMENT
```sql-- ============================================================-- TABLE 16: tenant_devices-- Device fingerprinting to enforce max_devices licensing-- ============================================================
CREATE TABLE tenant_devices (
id                  
UUID PRIMARY KEY DEFAULT gen_random_uuid(),
tenant_id           
UUID NOT NULL REFERENCES master_tenants(id),
device_fingerprint  VARCHAR(255) NOT NULL,
device_name         
VARCHAR(100),
  device_type         VARCHAR(30)
    CHECK (device_type IN ('reception_desktop','doctor_tablet','admin_laptop','mobile','other')),
  os_info             VARCHAR(100),
  browser_info        VARCHAR(100),
  is_active           BOOLEAN DEFAULT true,
  last_seen_at        TIMESTAMPTZ,
  registered_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_device_per_tenant UNIQUE (tenant_id, device_fingerprint)
);
```--
### SECTION 17 — FEATURE FLAGS SYSTEM
```sql-- ============================================================-- TABLE 17: feature_flags-- Dynamic feature toggling per tenant without redeployment-- ============================================================
CREATE TABLE feature_flags (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID REFERENCES master_tenants(id),   -- NULL = global
  flag_key       VARCHAR(100) NOT NULL,
  flag_name      VARCHAR(255) NOT NULL,
  description    TEXT,
  is_enabled     BOOLEAN NOT NULL DEFAULT false,
  allowed_tiers  TEXT[] DEFAULT ARRAY['enterprise'],
  config_json    JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_feature_flag UNIQUE (tenant_id, flag_key)
);-- Pre-seed default global flags
INSERT INTO feature_flags (flag_key, flag_name, allowed_tiers, is_enabled) VALUES
  ('AI_REPORTS',         'AI-Generated Clinical Reports',  ARRAY['professional','enterprise'], false),
  ('MULTI_BRANCH',       'Multi-Branch Operations',         ARRAY['enterprise'],               false),
  ('WHATSAPP_AUTOMATION','WhatsApp Automated Messaging',   
ARRAY['professional','enterprise'], false),
  ('GHOST_TRACKER',      'Ghost Evaluation Detection',      ARRAY['professional','enterprise'], true),
  ('LTV_SCORING',        '60/40 LTV Weighted Scoring',     ARRAY['professional','enterprise'], true),
  ('AUDIT_TRAIL',        'Full Audit Trail Access',         ARRAY['professional','enterprise'], true);
```
--
### SECTION 18 — ANALYTICS DATA WAREHOUSE
```sql-- ============================================================-- TABLE 18: analytics_daily_snapshots-- Separate analytical layer — no live query pressure on runtime-- ============================================================
CREATE TABLE analytics_daily_snapshots (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL REFERENCES master_tenants(id),
  snapshot_date               DATE NOT NULL,
  total_visits                INTEGER DEFAULT 0,
  total_new_patients          INTEGER DEFAULT 0,
  total_returning_patients    INTEGER DEFAULT 0,
  total_no_shows              INTEGER DEFAULT 0,
  total_cancellations         INTEGER DEFAULT 0,
  avg_wait_time_minutes       NUMERIC(5,1) DEFAULT 0,
  avg_session_duration_minutes NUMERIC(5,1) DEFAULT 0,
  avg_core_score              NUMERIC(5,1) DEFAULT 0,
  total_revenue_subunits      BIGINT DEFAULT 0,
  total_discounts_subunits    INTEGER DEFAULT 0,
  sla_breaches_count          INTEGER DEFAULT 0,
  hot_leads_count             INTEGER DEFAULT 0,
  conversion_rate             NUMERIC(5,2) DEFAULT 0,  -- inquiries → sessions
  snapshot_metadata           JSONB DEFAULT '{}',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_daily_snapshot UNIQUE (tenant_id, snapshot_date)
);
CREATE INDEX idx_snapshots_tenant_date ON analytics_daily_snapshots(tenant_id,
snapshot_date DESC);-- ============================================================-- TABLE 19: analytics_patient_metrics-- ============================================================
CREATE TABLE analytics_patient_metrics (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES master_tenants(id),
  metric_period         VARCHAR(20) NOT NULL CHECK (metric_period IN
('weekly','monthly','quarterly')),
  period_start          DATE NOT NULL,
  period_end            DATE NOT NULL,
  new_patients          INTEGER DEFAULT 0,
  reactivated_patients  INTEGER DEFAULT 0,
  churned_patients      INTEGER DEFAULT 0,
  avg_ltv_subunits      BIGINT DEFAULT 0,
  avg_disc_distribution JSONB DEFAULT '{}',   -- {driver:%, influencer:%, analytical:%, emotional:%}
  top_procedures        JSONB DEFAULT '[]',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_patient_metrics UNIQUE (tenant_id, metric_period, period_start)
);
```--
### SECTION 19 — CORE RULES ENGINE CONFIG
```sql-- ============================================================-- TABLE 20: core_rules_config-- Centralized scoring formulas, SLA thresholds, billing gates-- ============================================================
CREATE TABLE core_rules_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES master_tenants(id),   -- NULL = global default
  rule_category   VARCHAR(50) NOT NULL
    CHECK (rule_category IN ('scoring','sla','automation','billing','permissions')),
  rule_key        VARCHAR(100) NOT NULL,
  rule_name       VARCHAR(255) NOT NULL,
  rule_value      JSONB NOT NULL DEFAULT '{}',
  is_overridable  BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_rule_config UNIQUE (tenant_id, rule_key)
);-- Seed global default rules
INSERT INTO core_rules_config (rule_category, rule_key, rule_name, rule_value) VALUES
  ('scoring','weights','CORE Score Weights',
   '{"APS":0.28,"DRI":0.24,"RVS":0.20,"URI":0.15,"TSI":0.13}'),
  ('scoring','pqs_thresholds','PQS Penalty Thresholds',
  
'{"low_threshold":400,"mid_threshold":700,"low_penalty":0,"mid_penalty_factor":0.10,"high_penalty_factor":0.
  ('scoring','ltv_rule','LTV 60/40 Rule',
   '{"history_weight":0.60,"current_weight":0.40,"decay_months":18}'),
  ('sla','wait_times','SLA Wait Time Thresholds',
   '{"green_max_minutes":14,"yellow_max_minutes":24,"red_min_minutes":25}'),
  ('sla','buffer_window','Session Buffer Window',
   '{"buffer_minutes":5,"auto_close_minutes":60}'),
  ('sla','lock_abandonment','Lock Abandonment Protocol',
   '{"soft_warn_minutes":5,"hard_release_minutes":10}'),
  ('billing','trial_days','Trial Period Duration',
   '{"days":14}'),
  ('billing','tier_devices','Max Devices Per Tier',
   '{"trial":2,"essential":2,"professional":5,"enterprise":999}');
```--
### SECTION 20 — TENANT HEALTH SCORES
```sql-- ============================================================-- TABLE 21: tenant_health_scores-- Real-time health score (0–100) tracking tenant engagement-- ============================================================
CREATE TABLE tenant_health_scores (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES master_tenants(id),
  score_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  overall_score         SMALLINT NOT NULL DEFAULT 0 CHECK (overall_score BETWEEN 0 AND 100),
  login_frequency_score SMALLINT DEFAULT 0,
  activity_score        SMALLINT DEFAULT 0,
  patient_growth_score  SMALLINT DEFAULT 0,
  feature_adoption_score SMALLINT DEFAULT 0,
  revenue_trend_score   SMALLINT DEFAULT 0,
  score_details         JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_health_score_date UNIQUE (tenant_id, score_date)
);
```--
### SECTION 21 — NOTIFICATION QUEUE
```sql-- ============================================================-- TABLE 22: notification_queue
-- Decoupled internal notification bus — routed via channel adapters-- ============================================================
CREATE TABLE notification_queue (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES master_tenants(id),
  recipient_type   VARCHAR(30) NOT NULL CHECK (recipient_type IN ('patient','staff','admin')),
  recipient_id     UUID,
  recipient_phone  VARCHAR(20),
  recipient_email  VARCHAR(255),
  channel          VARCHAR(20) NOT NULL CHECK (channel IN ('whatsapp','sms','email','in_app')),
  template_key     VARCHAR(100),
  message_body     TEXT NOT NULL,
  priority         SMALLINT DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  status           VARCHAR(20) DEFAULT 'queued'
    CHECK (status IN ('queued','processing','sent','failed','cancelled')),
  retry_count      SMALLINT DEFAULT 0,
  max_retries      SMALLINT DEFAULT 3,
  scheduled_at     TIMESTAMPTZ DEFAULT NOW(),
  sent_at          TIMESTAMPTZ,
  error_message    TEXT,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notif_queue_pending ON notification_queue(scheduled_at, priority DESC)
  WHERE status = 'queued';
```--
### SECTION 22 — BILLING EVENTS LOG
```sql-- ============================================================-- TABLE 23: billing_events-- Hybrid billing audit: Stripe sandbox + manual activations-- ============================================================
CREATE TABLE billing_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID REFERENCES master_tenants(id),
  event_type       VARCHAR(50) NOT NULL
    CHECK (event_type IN (
      'trial_started','trial_expired','subscription_created',
      'subscription_upgraded','subscription_downgraded','subscription_cancelled',
'payment_succeeded','payment_failed','manual_activation',
'tier_override_by_admin','feature_flag_toggled'
)),
previous_tier    VARCHAR(50),
new_tier         
VARCHAR(50),
amount_subunits  INTEGER DEFAULT 0,
stripe_event_id  VARCHAR(255),                  
is_manual        
BOOLEAN DEFAULT false,          -- Sandbox event ID-- Manual activation via Super Admin
activated_by     UUID REFERENCES clinic_users(id),
activation_notes TEXT,
event_metadata   JSONB DEFAULT '{}',
created_at       
TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_billing_events_tenant ON billing_events(tenant_id, created_at DESC);
```--
## RLS POLICIES — ROW LEVEL SECURITY
```sql-- ============================================================-- ENABLE RLS ON ALL SENSITIVE TABLES-- ============================================================
ALTER TABLE master_tenants            
ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_users              
ALTER TABLE clinic_rooms              
ALTER TABLE clinic_procedures         
ALTER TABLE clinic_patients           
ENABLE ROW LEVEL SECURITY;
ENABLE ROW LEVEL SECURITY;
ENABLE ROW LEVEL SECURITY;
ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_longitudinal_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_inquiries          
ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_agenda_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_visit_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_invoices           
ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_ledger          
ALTER TABLE retention_followups       
ENABLE ROW LEVEL SECURITY;
ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_intake_responses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_delivery_breaches  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail               
ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_devices            
ALTER TABLE feature_flags             
ENABLE ROW LEVEL SECURITY;
ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue        
ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events            
ENABLE ROW LEVEL SECURITY;-- ============================================================-- JWT HELPER FUNCTIONS-- ============================================================
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
SELECT (auth.jwt() ->> 'tenant_id')::UUID;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
SELECT (auth.jwt() ->> 'user_role')::TEXT;
$$ LANGUAGE sql STABLE SECURITY DEFINER;-- ============================================================-- CORE RLS POLICIES-- ============================================================-- Tenants: each clinic sees only itself
CREATE POLICY rls_tenants_isolation ON master_tenants
FOR ALL USING (id = get_current_tenant_id());-- Super Admin sees all tenants
CREATE POLICY rls_tenants_super_admin ON master_tenants
FOR ALL USING (get_current_user_role() = 'super_admin');-- Users: tenant isolation
CREATE POLICY rls_users_isolation ON clinic_users
FOR ALL USING (tenant_id = get_current_tenant_id());-- Patients: tenant isolation
CREATE POLICY rls_patients_isolation ON clinic_patients
FOR ALL USING (tenant_id = get_current_tenant_id());-- Sessions: doctor sees own sessions; admin/receptionist sees all in tenant
CREATE POLICY rls_sessions_select ON clinic_visit_sessions
FOR SELECT USING (
tenant_id = get_current_tenant_id()
AND (
get_current_user_role() IN ('clinic_admin','super_admin','receptionist')
OR doctor_id = auth.uid()
)
);
CREATE POLICY rls_sessions_write ON clinic_visit_sessions
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY rls_sessions_update ON clinic_visit_sessions
  FOR UPDATE USING (
    tenant_id = get_current_tenant_id()
    AND (
      get_current_user_role() IN ('clinic_admin','super_admin')
      OR (get_current_user_role() = 'doctor'
          AND doctor_id = auth.uid()
          AND session_status NOT IN ('completed'))
      OR get_current_user_role() = 'receptionist'
    )
  );-- CRITICAL: Doctors cannot see invoice/financial data (RLS wall)
CREATE POLICY rls_invoices_no_doctor ON clinic_invoices
  FOR ALL USING (
    tenant_id = get_current_tenant_id()
    AND get_current_user_role() != 'doctor'
  );-- Audit trail: read-only for clinic_admin and super_admin
CREATE POLICY rls_audit_read ON audit_trail
  FOR SELECT USING (
    tenant_id = get_current_tenant_id()
    AND get_current_user_role() IN ('clinic_admin','super_admin')
  );-- Breaches: super_admin sees all; clinic_admin sees own tenant
CREATE POLICY rls_breaches_isolation ON system_delivery_breaches
  FOR ALL USING (
    get_current_user_role() = 'super_admin'
    OR tenant_id = get_current_tenant_id()
  );-- Feature flags: super_admin full control; others read their tenant flags
CREATE POLICY rls_flags_read ON feature_flags
  FOR SELECT USING (
    get_current_user_role() = 'super_admin'
    OR tenant_id = get_current_tenant_id()
    OR tenant_id IS NULL
  );
CREATE POLICY rls_flags_write ON feature_flags
  FOR ALL USING (get_current_user_role() = 'super_admin');
```--
## DATABASE TRIGGERS & SERVER-SIDE FUNCTIONS
```sql-- ============================================================-- TRIGGER 1: Consultation Fee Gate (v2.1 Mandatory)-- Prevents status change to 'in_consultation' without paid invoice-- ============================================================
CREATE OR REPLACE FUNCTION check_consultation_fee_gate()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_exists BOOLEAN;
BEGIN
  IF NEW.session_status = 'in_consultation' AND OLD.session_status = 'waiting' THEN
    SELECT EXISTS (
      SELECT 1 FROM clinic_invoices
      WHERE session_id = NEW.id
        AND invoice_status = 'paid'
        AND collected_by = NEW.initialized_by_receptionist
    ) INTO v_invoice_exists;
    IF NOT v_invoice_exists THEN
      RAISE EXCEPTION 'GATE_VIOLATION: Cannot transition to in_consultation without a fully paid
consultation invoice collected by the opening receptionist.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER tr_check_consultation_fee_gate
  BEFORE UPDATE ON clinic_visit_sessions
  FOR EACH ROW EXECUTE FUNCTION check_consultation_fee_gate();-- ============================================================-- TRIGGER 2: Session Buffer Window Activation-- Sets 5-minute pending_close window on session end-- ============================================================
CREATE OR REPLACE FUNCTION fn_set_session_buffer()
RETURNS TRIGGER AS $$
BEGIN
IF NEW.session_ended_at IS NOT NULL AND OLD.session_ended_at IS NULL THEN
NEW.session_status := 'pending_close';
NEW.buffer_window_expires_at := NEW.session_ended_at + INTERVAL '5 minutes';
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER tr_session_buffer
BEFORE UPDATE ON clinic_visit_sessions
FOR EACH ROW EXECUTE FUNCTION fn_set_session_buffer();-- ============================================================-- TRIGGER 3: Auto-Close Timer Initialization-- Sets 60-minute auto-close window on patient departure-- ============================================================
CREATE OR REPLACE FUNCTION fn_set_auto_close()
RETURNS TRIGGER AS $$
BEGIN
IF NEW.visit_closed_at IS NOT NULL
AND OLD.visit_closed_at IS NULL
AND NEW.session_status = 'pending_close' THEN
NEW.auto_close_at := NEW.visit_closed_at + INTERVAL '60 minutes';
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER tr_auto_close_timer
BEFORE UPDATE ON clinic_visit_sessions
FOR EACH ROW EXECUTE FUNCTION fn_set_auto_close();-- ============================================================-- TRIGGER 4: Ghost Evaluation Honeypot-- Silent honeypot: accepts write but returns OLD values-- Logs breach to system_delivery_breaches-- ============================================================
CREATE OR REPLACE FUNCTION fn_detect_ghost_evaluation()
RETURNS TRIGGER AS $$
DECLARE
v_closed_at   TIMESTAMPTZ;
  v_ghost_window TIMESTAMPTZ;
BEGIN
  SELECT visit_closed_at INTO v_closed_at
  FROM clinic_visit_sessions WHERE id = NEW.id;
  IF v_closed_at IS NOT NULL THEN
    v_ghost_window := v_closed_at + INTERVAL '10 minutes';
    IF NOW() > v_ghost_window THEN
      INSERT INTO system_delivery_breaches (
        tenant_id, breach_type, severity,
        related_session_id, related_user_id, breach_details
      ) VALUES (
        NEW.tenant_id, 'ghost_evaluation', 'critical',
        NEW.id, auth.uid(),
        jsonb_build_object(
          'attempted_at',     NOW(),
          'minutes_after_close', EXTRACT(EPOCH FROM (NOW() - v_closed_at))/60,
          'changed_fields',   to_jsonb(NEW) - to_jsonb(OLD)
        )
      );
      RETURN OLD; -- Honeypot: silently reject, return unmodified row
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER tr_ghost_evaluation_guard
  BEFORE UPDATE OF score_aps, score_dri, score_tsi, score_uri, score_pqs, score_rvs
  ON clinic_visit_sessions
  FOR EACH ROW EXECUTE FUNCTION fn_detect_ghost_evaluation();-- ============================================================-- TRIGGER 5: Automatic Audit Trail on Sensitive Tables-- ============================================================
CREATE OR REPLACE FUNCTION fn_audit_sensitive_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_trail (
      tenant_id, actor_id, actor_role,
      action, table_name, record_id,
      old_values, new_values
    ) VALUES (
      COALESCE(NEW.tenant_id, OLD.tenant_id),
      auth.uid(),
      get_current_user_role(),
      'UPDATE', TG_TABLE_NAME, OLD.id,
      to_jsonb(OLD), to_jsonb(NEW)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER tr_audit_sessions
  AFTER UPDATE ON clinic_visit_sessions
  FOR EACH ROW EXECUTE FUNCTION fn_audit_sensitive_changes();
CREATE TRIGGER tr_audit_invoices
  AFTER UPDATE ON clinic_invoices
  FOR EACH ROW EXECUTE FUNCTION fn_audit_sensitive_changes();
CREATE TRIGGER tr_audit_tenants
  AFTER UPDATE ON master_tenants
  FOR EACH ROW EXECUTE FUNCTION fn_audit_sensitive_changes();-- ============================================================-- TRIGGER 6: Triangulation Auto-Verification-- Auto-computes match_triangulation on invoice update-- ============================================================
CREATE OR REPLACE FUNCTION fn_verify_triangulation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.doctor_par_confirmed = true
     AND NEW.collected_reception = true
     AND NEW.amount_paid_subunits >= (NEW.total_subunits * 0.80) THEN
    NEW.match_triangulation := true;
  ELSE
    NEW.match_triangulation := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER tr_verify_triangulation
  BEFORE UPDATE OF doctor_par_confirmed, collected_reception, amount_paid_subunits
  ON clinic_invoices
FOR EACH ROW EXECUTE FUNCTION fn_verify_triangulation();
```--
## PART 1B — PRODUCTION DIRECTORY ARCHITECTURE
```
core-system-platform/                 
│
├── .env.example                      
├── .env.local                        
├── package.json
├── tsconfig.json
├── vite.config.ts                    
├── tailwind.config.ts
├── components.json                   
├── vercel.json                       
│
├── public/
│   ├── manifest.json                 
│   ├── sw-register.js                
│   └── icons/                        
│
├── supabase/
│   ├── config.toml
│   ├── migrations/                   
← Monorepo root
← Environment template
← Local secrets (gitignored)
← Vite + PWA plugin config
← Shadcn/UI config
← Edge middleware routing
← PWA manifest (offline-first)
← Service worker registration
← 192px, 512px, maskable
← Ordered SQL migration files
│   │   ├── 001_extensions.sql
│   │   ├── 002_master_tenants.sql
│   │   ├── 003_clinic_users.sql
│   │   ├── 004_rooms_procedures.sql
│   │   ├── 005_patients.sql
│   │   ├── 006_agenda.sql
│   │   ├── 007_sessions.sql
│   │   ├── 008_invoices.sql
│   │   ├── 009_surveys_followups.sql
│   │   ├── 010_breaches_audit.sql
│   │   ├── 011_devices_inventory.sql
│   │   ├── 012_analytics_flags.sql
│   │   ├── 013_notification_billing.sql
│   │   ├── 014_rls_policies.sql
│   │   ├── 015_triggers_functions.sql
│   │   └── 016_seed_rules_flags.sql
│   │
│   ├── functions/                    ← Supabase Edge Functions (Deno)
│   │   ├── auto-lock-release/        ← CRON: every 1 min, release idle locks
│   │   │   └── index.ts
│   │   ├── leakage-detector/         ← CRON: every hour, flag treatment gaps
│   │   │   └── index.ts
│   │   ├── score-calculator/         ← On-demand: compute CORE Score
│   │   │   └── index.ts
│   │   ├── analytics-snapshot/       ← CRON: nightly data warehouse snapshot
│   │   │   └── index.ts
│   │   ├── notification-processor/   ← CRON: every 5 min, drain queue
│   │   │   └── index.ts
│   │   ├── license-validator/        ← On-demand: validate device + license
│   │   │   └── index.ts
│   │   └── stripe-webhook/           ← Webhook: Stripe sandbox events
│   │       └── index.ts
│   │
│   └── seed/
│       ├── super_admin.sql
│       ├── demo_tenant.sql
│       └── core_rules_defaults.sql
│
└── src/
    ├── main.tsx                      ← Entry point: React root mount
    ├── App.tsx                       ← Root providers (Query, Zustand, Auth)
    ├── service-worker.ts             ← Workbox: CacheFirst + BackgroundSync
    ├── router.tsx                    ← Route definitions + role guards
    │
    ├── core/                         ═══ CORE PLATFORM LAYER ═══
    │   │
    │   ├── auth/
    │   │   ├── AuthProvider.tsx      ← Supabase Auth + JWT claims injection
    │   │   ├── PinAuthProvider.tsx   ← 4-digit PIN fast-switch (kiosk mode)
    │   │   ├── useAuth.ts
    │   │   ├── useRole.ts
    │   │   ├── usePermissions.ts     ← Wraps permissionMatrix
    │   │   ├── RoleGuard.tsx         ← HOC: blocks render by role
    │   │   └── types.ts
    │   │
    │   ├── events/                   ← INTERNAL EVENT BUS (decoupled)
    │   │   ├── EventBus.ts           ← Typed pub/sub; no external deps
    │   │   ├── events.types.ts       ← AppointmentCreatedEvent, SessionStatusChangedEvent, etc.
    │   │   └── handlers/
    │   │       ├── onAppointmentCreated.ts    → triggers Analytics + Reminder queue
    │   │       ├── onSessionStatusChanged.ts  → triggers SLA radar update + locks
    │   │       ├── onPaymentCollected.ts      → triggers Triangulation check
    │   │       └── onBreach.ts                → triggers Notification + audit write
    │   │
    │   ├── notifications/            ← INTERNAL NOTIFICATION BUS
    │   │   ├── NotificationBus.ts    ← Enqueues to notification_queue table
    │   │   ├── adapters/
    │   │   │   ├── WhatsAppAdapter.ts  (Twilio / Infobip)
    │   │   │   ├── SMSAdapter.ts
    │   │   │   ├── EmailAdapter.ts
    │   │   │   └── ManualAdapter.ts   (logs to queue for human sending)
    │   │   └── gateway.interface.ts  ← MessageGateway pluggable contract
    │   │
    │   ├── permissions/              ← RBAC PERMISSION MATRIX
    │   │   ├── permissionMatrix.ts   ← Static map: role → allowed actions
    │   │   ├── PermissionGuard.tsx   ← Inline component guard
    │   │   └── types.ts              ← Permission enums
    │   │
    │   ├── offline/                  ← CORE_SYSTEM_DRIVE (Offline-First)
    │   │   ├── CORE_SYSTEM_DRIVE.ts  ← IndexedDB abstraction layer
    │   │   ├── MutationQueue.ts      ← Pending operations FIFO queue
    │   │   ├── SyncEngine.ts         ← Background sync on reconnect
    │   │   ├── ConflictResolver.ts   ← Cloud timestamp always wins
    │   │   └── NetworkMonitor.ts     ← Polls every 5s; 3 failures → offline
    │   │
    │   └── realtime/                 ← SUPABASE REALTIME CHANNELS
    │       ├── RealtimeProvider.tsx
    │       ├── useQueueChannel.ts    ← Live queue updates broadcast
    │       ├── useSessionChannel.ts  ← Session status changes
    │       └── useAlertChannel.ts    ← Breach + SLA alerts
    │
    ├── rules/                        ═══ CORE_RULES_ENGINE (Isolated) ═══
    │   │
    │   ├── scoring/
    │   │   ├── CoreScoreEngine.ts    ← Main formula: APS×0.28 + DRI×0.24 ...
    │   │   ├── IndicatorWeights.ts   ← Pulled from core_rules_config
    │   │   ├── PqsPenaltyCalculator.ts ← Tiered penalty: <400 | 400-700 | >700
    │   │   ├── LtvWeightRule.ts      ← 60/40 rule: 18-month decay check
    │   │   ├── PrestigeInflationFilter.ts ← Integrity filter 1
    │   │   ├── TriangulationFilter.ts    ← Integrity filter 2
    │   │   └── PatientClassifier.ts  ← Maps score → low/med/high/qualified/hot
    │   │
    │   ├── sla/
    │   │   ├── SlaRadar.ts           ← Computes green/yellow/red from wait time
    │   │   ├── SamPatelProtocol.ts   ← Red breach: receptionist action handler
    │   │   └── SlaThresholds.ts      ← <15 safe | 15-24 warn | ≥25 breach
    │   │
    │   ├── sessions/
    │   │   ├── SessionLifecycle.ts   ← State machine: inquiry→waiting→consultation...
    │   │   ├── LockManager.ts        ← Acquire/release live card locks
    │   │   ├── BufferWindowRule.ts   ← 5-min post-exam window
    │   │   └── AutoCloseRule.ts      ← 60-min auto-close logic
    │   │
    │   └── billing/
    │       ├── TierGates.ts          ← Feature access by subscription tier
    │       ├── DeviceLimiter.ts      ← Enforce max_devices per tenant
    │       └── TrialExpiry.ts        ← 14-day countdown enforcement
    │
    ├── domain/                       ═══ DOMAIN MODULES (Data Layer) ═══
    │   ├── tenants/
    │   │   ├── tenants.queries.ts    ← React Query hooks: useTenant, useAllTenants
    │   │   ├── tenants.mutations.ts  ← updateTier, toggleFlag, activateTenant
    │   │   └── tenants.types.ts
    │   │
    │   ├── patients/
    │   │   ├── patients.queries.ts
    │   │   ├── patients.mutations.ts
    │   │   ├── patients.repository.ts ← Offline-capable CRUD via DRIVE
    │   │   └── patients.types.ts
    │   │
    │   ├── agenda/
    │   │   ├── agenda.queries.ts
    │   │   ├── agenda.mutations.ts
    │   │   ├── agenda.conflicts.ts   ← GIST overlap detection wrapper
    │   │   └── agenda.types.ts
    │   │
    │   ├── queue/
    │   │   ├── queue.queries.ts      ← Real-time queue for reception screen
    │   │   ├── queue.mutations.ts    ← Drag-drop reorder, hot-swap
    │   │   ├── queue.locks.ts        ← Lock acquire/release + abandonment
    │   │   └── queue.types.ts
    │   │
    │   ├── sessions/
    │   │   ├── sessions.queries.ts
    │   │   ├── sessions.mutations.ts ← Status transitions, score writes
    │   │   └── sessions.types.ts
    │   │
    │   ├── invoicing/
    │   │   ├── invoicing.queries.ts
    │   │   ├── invoicing.mutations.ts
    │   │   ├── invoicing.calculator.ts ← Subunit math (no FLOAT anywhere)
    │   │   └── invoicing.types.ts
    │   │
    │   ├── scoring/
    │   │   ├── scoring.service.ts    ← Wraps CoreScoreEngine + DB write
    │   │   ├── scoring.mutations.ts
    │   │   └── scoring.types.ts
    │   │
    │   ├── surveys/
    │   │   ├── surveys.queries.ts
    │   │   ├── surveys.mutations.ts  ← Page-by-page partial saves
    │   │   └── surveys.types.ts
    │   │
    │   └── analytics/
    │       ├── analytics.queries.ts  ← Reads from snapshot tables only
    │       ├── analytics.snapshots.ts
    │       └── analytics.types.ts
    │
    ├── features/                     ═══ FEATURE MODULES (UI Screens) ═══
    │   │
    │   ├── kiosk/                    ← AMBIENT KIOSK (Idle State)
    │   │   ├── AmbientKioskView.tsx  ← Full-screen luxury clinic display
    │   │   ├── PinPadOverlay.tsx     ← 4-digit numeric overlay
    │   │   ├── StaffAvatarRail.tsx   ← Tap avatar → PIN prompt
    │   │   └── IdleWatcher.tsx       ← 5min doctor / 10min reception timeout
    │   │
    │   ├── reception/                ← RECEPTION DASHBOARD
    │   │   ├── ReceptionLayout.tsx
    │   │   ├── LiveQueueBoard.tsx    ← Real-time drag-drop queue board
    │   │   ├── PatientCard.tsx       ← Queue card: SLA badge + lock indicator
    │   │   ├── HotSwapSuggestion.tsx ← Flashing green card on room vacancy
    │   │   ├── SlaRadarBadge.tsx     ← Green/Yellow/Red timer badge
    │   │   ├── NewInquiryForm.tsx    ← Walk-in intake form
    │   │   ├── PatientLookup.tsx     ← Phone-search patient finder
    │   │   ├── QuickInvoice.tsx      ← Rapid consultation fee collection
    │   │   └── SessionLockIndicator.tsx ← Shows who holds a card lock
    │   │
    │   ├── doctor/                   ← DOCTOR DASHBOARD
    │   │   ├── DoctorLayout.tsx
    │   │   ├── MyQueueView.tsx       ← Doctor's patient queue view
    │   │   ├── PatientSessionView.tsx ← Full patient session detail
    │   │   ├── SandlerScriptPanel.tsx ← Golden sidebar: tactical live scripts
    │   │   ├── CoreScoreWidget.tsx   ← Behavioral score visualization
    │   │   ├── AllergyGate.tsx       ← MANDATORY allergy confirmation wall
    │   │   ├── ClinicalNotes.tsx     ← Medical notes editor (doctor-only write)
    │   │   ├── ParDecisionPanel.tsx  ← Acceptance/rejection decision form
    │   │   └── DiscProfileBadge.tsx  ← DISC personality type indicator
    │   │
    │   ├── clinic-admin/             ← CLINIC ADMIN DASHBOARD
    │   │   ├── AdminLayout.tsx
    │   │   ├── AnalyticsOverview.tsx ← Snapshot-based KPI cards
    │   │   ├── RevenueCards.tsx      ← Revenue charts from snapshots
    │   │   ├── StaffPerformance.tsx  ← Per-staff session/revenue metrics
    │   │   ├── BreachLog.tsx         ← Filterable breach log viewer
    │   │   ├── AuditTrailViewer.tsx  ← Paginated audit trail reader
    │   │   ├── ScheduleManager.tsx   ← Doctor schedule + room management
    │   │   ├── PatientDirectory.tsx  ← Searchable patient list with LTV
    │   │   └── InventoryManager.tsx  ← Consumption + waste tracking
    │   │
    │   ├── super-admin/              ← SOVEREIGN SUPER ADMIN DASHBOARD
    │   │   ├── SuperAdminLayout.tsx
    │   │   ├── TenantRegistry.tsx    ← All tenants: table + health scores
    │   │   ├── TenantDetailPanel.tsx ← Drill-down: full tenant profile
    │   │   ├── TierOverridePanel.tsx ← One-click tier activation buttons
    │   │   ├── FeatureFlagManager.tsx ← Toggle any flag per tenant
    │   │   ├── GlobalHealthScores.tsx ← Health score leaderboard
    │   │   ├── BillingEventsLog.tsx  ← Full billing history across tenants
    │   │   └── SystemAlertConsole.tsx ← Cross-tenant breach console
    │   │
    │   ├── survey/                   ← SURVEY PIPELINE (3-Station)
    │   │   ├── SurveyRouter.tsx      ← Handles station routing
    │   │   ├── Page1Identity.tsx     ← Patient phone survey: identity
    │   │   ├── Page2ClinicalIntent.tsx ← Intent + reason for visit
    │   │   ├── Page3BehavioralProfile.tsx ← Readiness + concerns → scores
    │   │   ├── Page4Expectations.tsx ← Priorities + main concern
    │   │   ├── Page5ConsentSign.tsx  ← SVG signature + WhatsApp redirect
    │   │   └── SurveyProgressBar.tsx
    │   │
    │   ├── billing/                  ← HYBRID BILLING MODULE
    │   │   ├── BillingPage.tsx
    │   │   ├── TierPricingCards.tsx  ← Trial / Essential / Professional / Enterprise
    │   │   ├── StripeSandboxPanel.tsx ← Stripe test-mode simulation
    │   │   ├── ManualActivationPortal.tsx ← WhatsApp CTA + ticket submission
    │   │   ├── TrialCountdown.tsx    ← 14-day trial remaining indicator
    │   │   └── SubscriptionStatus.tsx
    │   │
    │   └── auth/                     ← AUTH SCREENS
    │       ├── TenantOnboarding.tsx  ← New clinic registration
    │       ├── LicenseEntry.tsx      ← License key + device registration
    │       └── DeviceRegistration.tsx
    │
    ├── infrastructure/               ═══ INFRASTRUCTURE ADAPTERS ═══
    │   ├── supabase/
    │   │   ├── client.ts             ← Supabase client init with JWT claims
    │   │   ├── database.types.ts     ← Auto-generated Supabase types
    │   │   └── rpc.ts                ← Typed RPC function wrappers
    │   │
    │   ├── messaging/
    │   │   ├── gateway.interface.ts  ← MessageGateway + DeliveryResult types
    │   │   ├── TwilioAdapter.ts
    │   │   ├── InfobipAdapter.ts
    │   │   └── ManualAdapter.ts
    │   │
    │   ├── pwa/
    │   │   ├── workbox.config.ts     ← CacheFirst app shell + SWR for API
    │   │   ├── keepAlive.ts          ← iOS: KEEP_CACHE_ALIVE every 48h
    │   │   └── OfflineBanner.tsx     ← Amber warning banner component
    │   │
    │   └── stripe/
    │       ├── stripeClient.ts       ← Stripe.js test-mode initialization
    │       └── stripeProducts.ts     ← Sandbox product/price IDs
    │
    ├── shared/                       ═══ SHARED UTILITIES ═══
    │   ├── components/
    │   │   ├── ui/                   ← Shadcn/UI component extensions
    │   │   ├── CoreScoreMeter.tsx    ← Animated score display (0–100)
    │   │   ├── SlaTimer.tsx          ← Countdown timer with color states
    │   │   ├── OfflineBanner.tsx     ← Amber offline indicator
    │   │   ├── TenantBranding.tsx    ← Logo + primary color injection
    │   │   └── PermissionGate.tsx    ← Inline permission wrapper
    │   │
    │   ├── hooks/
    │   │   ├── useTenant.ts
    │   │   ├── useQueue.ts           ← Live queue with realtime subscription
    │   │   ├── useSlaTimer.ts        ← Interval-based SLA countdown
    │   │   ├── useNetworkStatus.ts   ← Online/offline detection
    │   │   └── useAuditLog.ts        ← Typed audit write helper
    │   │
    │   ├── store/
    │   │   ├── authStore.ts          ← Zustand: user + role + permissions
    │   │   ├── tenantStore.ts        ← Zustand: tenant config + feature flags
    │   │   ├── queueStore.ts         ← Zustand: live queue state
    │   │   └── uiStore.ts            ← Zustand: modals, toasts, kiosk mode
    │   │
    │   ├── types/
    │   │   ├── database.ts           ← DB table type aliases
    │   │   ├── scoring.ts            ← Score indicator + class types
    │   │   ├── queue.ts              ← Queue card + lock types
    │   │   └── billing.ts            ← Tier + billing event types
    │   │
    │   └── utils/
    │       ├── currency.ts           ← subunitsToDisplay() / displayToSubunits()
    │       ├── dateTime.ts           ← Asia/Amman timezone formatters
    │       ├── deviceFingerprint.ts  ← Browser fingerprint hash generator
    │       └── scoreDisplay.ts       ← backend/10 → ROUND(,1) display
    │
    └── styles/
        ├── globals.css               ← CSS custom properties
        └── tailwind-tokens.css       ← Design tokens
```--
## SCORING ENGINE FORMULAS (CORE_RULES_ENGINE Reference)
```typescript
// src/rules/scoring/CoreScoreEngine.ts
export const INDICATOR_WEIGHTS = {
  APS: 0.28,  // Acceptance Probability Score
  DRI: 0.24,  // Decision Readiness Index
  RVS: 0.20,  // Results Value Score
  URI: 0.15,  // User Receptiveness Index
  TSI: 0.13,  // Trust Sensitivity Index
  // PQS = Price Qualification Score (penalty, not additive weight)
};
export function computeCoreScore(indicators: {
  APS: number; DRI: number; RVS: number;
  URI: number; TSI: number; PQS: number;
}): { backend: number; display: number; patientClass: PatientClass } {
  const raw =
    indicators.APS * 0.28 +
    indicators.DRI * 0.24 +
    indicators.RVS * 0.20 +
    indicators.URI * 0.15 +
    indicators.TSI * 0.13;
  // Tiered PQS penalty
  let penalty = 0;
  if (indicators.PQS >= 700) penalty = indicators.PQS * 0.20;
  else if (indicators.PQS >= 400) penalty = indicators.PQS * 0.10;
  const backend = Math.max(0, Math.min(1000, Math.round(raw - penalty)));
  const display = Math.round(backend / 10.0 * 10) / 10; // ROUND to 1 decimal
  return { backend, display, patientClass: classifyPatient(display) };
}
// 60/40 LTV Rule
export function computeWeightedScore(
  historicalAvg: number,
  sessionScore: number,
  lastVisitDate: Date | null
): { score: number; mode: 'first_time' | 'weighted_ltv' } {
  const monthsAbsent = lastVisitDate
    ? (Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    : Infinity;
  if (monthsAbsent > 18) return { score: sessionScore, mode: 'first_time' };
  const weighted = Math.round(historicalAvg * 0.60 + sessionScore * 0.40);
  return { score: weighted, mode: 'weighted_ltv' };
}
export function classifyPatient(display: number): PatientClass {
  if (display >= 90) return 'hot_lead';
  if (display >= 80) return 'qualified';
  if (display >= 60) return 'high_priority';
  if (display >= 40) return 'medium_priority';
  return 'low_priority';
}
```--
## PERFORMANCE TARGETS (Constitution v2.1 SLA)
| Metric | Target | Maximum |
|--------|--------|---------|
| Page Load (first load) | < 1.5s | 3s |
| Page Load (PWA cache hit) | < 0.3s | 0.8s |
| API Response Time | < 200ms | 500ms |
| Realtime Update Latency | < 100ms | 300ms |
| Score Calculation (Edge) | < 50ms | 150ms |
| Image Upload | < 3s | 8s |
| Offline → Online Sync | < 5s | 15s |
| System Uptime | 99.5% | 99.0% |--
*Blueprint authored from CORE SYSTEM™ Engineering Constitutions v2.0 + v2.1*
*Intellectual Property: Yazeed Waleed © June 2026*
