-- Retention Followups Table
-- Tracks patient follow-up scheduling for retention

CREATE TABLE retention_followups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES master_tenants(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES clinic_patients(id) ON DELETE CASCADE,
    session_id UUID REFERENCES clinic_visit_sessions(id) ON DELETE SET NULL,
    
    -- Follow-up details
    follow_up_type TEXT NOT NULL,
    scheduled_date DATE NOT NULL,
    scheduled_time TEXT,
    
    -- Contact tracking
    contact_attempts INTEGER NOT NULL DEFAULT 0,
    last_contact_at TIMESTAMPTZ,
    next_contact_at TIMESTAMPTZ,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending',
    outcome TEXT,
    outcome_notes TEXT,
    
    -- Assignment
    assigned_to UUID REFERENCES clinic_users(id) ON DELETE SET NULL,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    CONSTRAINT retention_followups_type_check CHECK (follow_up_type IN ('scheduled', 'unscheduled', 'recall', 'post_procedure', 'annual_checkup', 'custom')),
    CONSTRAINT retention_followups_status_check CHECK (status IN ('pending', 'contacted', 'scheduled', 'completed', 'failed', 'cancelled', 'no_response')),
    CONSTRAINT retention_followups_outcome_check CHECK (outcome IS NULL OR outcome IN ('booked', 'declined', 'deferred', 'no_longer_interested', 'unreachable', 'other'))
);

-- Patient Intake Responses Table
-- Stores patient intake form responses

CREATE TABLE patient_intake_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES master_tenants(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES clinic_patients(id) ON DELETE CASCADE,
    session_id UUID REFERENCES clinic_visit_sessions(id) ON DELETE SET NULL,
    
    -- Form details
    form_type TEXT NOT NULL,
    form_version TEXT NOT NULL DEFAULT '1.0',
    
    -- Response data
    responses JSONB NOT NULL DEFAULT '{}',
    
    -- Consent tracking
    consent_given BOOLEAN DEFAULT FALSE,
    consent_at TIMESTAMPTZ,
    consent_ip TEXT,
    
    -- Metadata
    is_complete BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT patient_intake_responses_form_type_check CHECK (form_type IN ('new_patient', 'follow_up', 'procedure_specific', 'insurance', 'consent', 'medical_history'))
);

CREATE INDEX idx_retention_followups_tenant_id ON retention_followups(tenant_id);
CREATE INDEX idx_retention_followups_patient_id ON retention_followups(patient_id);
CREATE INDEX idx_retention_followups_scheduled_date ON retention_followups(scheduled_date);
CREATE INDEX idx_retention_followups_status ON retention_followups(status);
CREATE INDEX idx_patient_intake_responses_tenant_id ON patient_intake_responses(tenant_id);
CREATE INDEX idx_patient_intake_responses_patient_id ON patient_intake_responses(patient_id);
CREATE INDEX idx_patient_intake_responses_session_id ON patient_intake_responses(session_id);
