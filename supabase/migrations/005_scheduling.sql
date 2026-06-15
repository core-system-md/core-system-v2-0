-- Clinic Inquiries Table
-- Patient inquiries and appointment requests

CREATE TABLE clinic_inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES master_tenants(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES clinic_patients(id) ON DELETE SET NULL,
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    patient_email TEXT,
    inquiry_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    preferred_date DATE,
    preferred_time TEXT,
    procedure_id UUID REFERENCES clinic_procedures(id) ON DELETE SET NULL,
    notes TEXT,
    assigned_to UUID REFERENCES clinic_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT clinic_inquiries_status_check CHECK (status IN ('pending', 'contacted', 'scheduled', 'cancelled', 'closed')),
    CONSTRAINT clinic_inquiries_type_check CHECK (inquiry_type IN ('appointment', 'information', 'emergency', 'follow_up', 'other'))
);

-- Master Agenda Events Table
-- Unified scheduling for all event types
-- Uses EXCLUDE constraint for temporal conflict detection

CREATE TABLE master_agenda_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES master_tenants(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL,
    resource_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    patient_id UUID REFERENCES clinic_patients(id) ON DELETE SET NULL,
    user_id UUID REFERENCES clinic_users(id) ON DELETE SET NULL,
    procedure_id UUID REFERENCES clinic_procedures(id) ON DELETE SET NULL,
    title TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT master_agenda_events_end_after_start CHECK (end_at > start_at),
    CONSTRAINT master_agenda_events_status_check CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    CONSTRAINT master_agenda_events_resource_type_check CHECK (resource_type IN ('room', 'doctor', 'equipment')),
    CONSTRAINT master_agenda_events_event_type_check CHECK (event_type IN ('appointment', 'block', 'break', 'maintenance', 'meeting')),
    CONSTRAINT no_overlapping_events EXCLUDE USING GIST (
        tenant_id WITH =,
        resource_id WITH =,
        tsrange(start_at, end_at) WITH &&
    )
);

CREATE INDEX idx_clinic_inquiries_tenant_id ON clinic_inquiries(tenant_id);
CREATE INDEX idx_clinic_inquiries_status ON clinic_inquiries(status);
CREATE INDEX idx_clinic_inquiries_patient_id ON clinic_inquiries(patient_id);
CREATE INDEX idx_master_agenda_events_tenant_id ON master_agenda_events(tenant_id);
CREATE INDEX idx_master_agenda_events_resource ON master_agenda_events(resource_type, resource_id);
CREATE INDEX idx_master_agenda_events_start_at ON master_agenda_events(start_at);
CREATE INDEX idx_master_agenda_events_patient_id ON master_agenda_events(patient_id);
CREATE INDEX idx_master_agenda_events_user_id ON master_agenda_events(user_id);
