-- Clinic Visit Sessions Table (v2.1)
-- CRITICAL: Comprehensive session tracking for patient visits
-- Tracks complete lifecycle from check-in to check-out

CREATE TABLE clinic_visit_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES master_tenants(id) ON DELETE CASCADE,
    
    -- Core identifiers
    patient_id UUID NOT NULL REFERENCES clinic_patients(id) ON DELETE CASCADE,
    agenda_event_id UUID REFERENCES master_agenda_events(id) ON DELETE SET NULL,
    
    -- Session lifecycle timestamps
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    actual_check_in TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    actual_check_out TIMESTAMPTZ,
    
    -- Session status and workflow
    session_status TEXT NOT NULL DEFAULT 'pending',
    check_in_method TEXT,
    check_out_method TEXT,
    
    -- Assigned resources
    primary_doctor_id UUID REFERENCES clinic_users(id) ON DELETE SET NULL,
    assigned_room_id UUID REFERENCES clinic_rooms(id) ON DELETE SET NULL,
    procedure_id UUID REFERENCES clinic_procedures(id) ON DELETE SET NULL,
    
    -- Time tracking metrics (in minutes)
    wait_time_minutes INTEGER,
    service_time_minutes INTEGER,
    total_time_minutes INTEGER,
    
    -- Financial tracking
    -- FILS ONLY: 1 JOD = 1000 fils. Never FLOAT/DECIMAL.
    base_charge_fils INTEGER,
    -- FILS ONLY: 1 JOD = 1000 fils. Never FLOAT/DECIMAL.
    additional_charges_fils INTEGER DEFAULT 0,
    -- FILS ONLY: 1 JOD = 1000 fils. Never FLOAT/DECIMAL.
    discount_fils INTEGER DEFAULT 0,
    -- FILS ONLY: 1 JOD = 1000 fils. Never FLOAT/DECIMAL.
    total_charge_fils INTEGER,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    
    -- Quality and feedback
    patient_satisfaction_score INTEGER,
    patient_feedback TEXT,
    doctor_notes TEXT,
    diagnosis TEXT,
    treatment_performed TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    
    -- Compliance and audit
    is_abandoned BOOLEAN DEFAULT FALSE,
    abandoned_at TIMESTAMPTZ,
    abandonment_reason TEXT,
    
    -- Metadata
    session_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT clinic_visit_sessions_status_check CHECK (session_status IN (
        'pending', 'checked_in', 'in_progress', 'completed', 'cancelled', 
        'no_show', 'abandoned', 'rescheduled'
    )),
    CONSTRAINT clinic_visit_sessions_check_in_method_check CHECK (check_in_method IS NULL OR check_in_method IN (
        'self_kiosk', 'reception', 'mobile_app', 'doctor_override'
    )),
    CONSTRAINT clinic_visit_sessions_check_out_method_check CHECK (check_out_method IS NULL OR check_out_method IN (
        'self_kiosk', 'reception', 'mobile_app', 'doctor_override', 'auto_checkout', 'abandoned'
    )),
    CONSTRAINT clinic_visit_sessions_payment_status_check CHECK (payment_status IN (
        'pending', 'partial', 'paid', 'waived', 'refunded', 'disputed'
    )),
    CONSTRAINT clinic_visit_sessions_satisfaction_check CHECK (
        patient_satisfaction_score IS NULL OR 
        (patient_satisfaction_score >= 1 AND patient_satisfaction_score <= 5)
    ),
    CONSTRAINT valid_charge_totals CHECK (total_charge_fils >= 0)
);

CREATE INDEX idx_clinic_visit_sessions_tenant_id ON clinic_visit_sessions(tenant_id);
CREATE INDEX idx_clinic_visit_sessions_patient_id ON clinic_visit_sessions(patient_id);
CREATE INDEX idx_clinic_visit_sessions_status ON clinic_visit_sessions(session_status);
CREATE INDEX idx_clinic_visit_sessions_scheduled_date ON clinic_visit_sessions(scheduled_start);
CREATE INDEX idx_clinic_visit_sessions_actual_check_in ON clinic_visit_sessions(actual_check_in);
CREATE INDEX idx_clinic_visit_sessions_doctor_id ON clinic_visit_sessions(primary_doctor_id);
CREATE INDEX idx_clinic_visit_sessions_agenda_event_id ON clinic_visit_sessions(agenda_event_id);
CREATE INDEX idx_clinic_visit_sessions_payment_status ON clinic_visit_sessions(payment_status);
