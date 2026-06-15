-- Clinic Rooms Table
-- Treatment rooms within a clinic

CREATE TABLE clinic_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES master_tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    capacity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT clinic_rooms_name_tenant_unique UNIQUE (tenant_id, name),
    CONSTRAINT clinic_rooms_code_tenant_unique UNIQUE (tenant_id, code)
);

-- Clinic Procedures Table
-- Medical procedures offered by the clinic
-- FILS ONLY: 1 JOD = 1000 fils. Never FLOAT/DECIMAL.

CREATE TABLE clinic_procedures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES master_tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    base_price_fils INTEGER NOT NULL,
    -- FILS ONLY: 1 JOD = 1000 fils. Never FLOAT/DECIMAL.
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    category TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT clinic_procedures_name_tenant_unique UNIQUE (tenant_id, name),
    CONSTRAINT clinic_procedures_code_tenant_unique UNIQUE (tenant_id, code),
    CONSTRAINT base_price_fils_positive CHECK (base_price_fils >= 0)
);

CREATE INDEX idx_clinic_rooms_tenant_id ON clinic_rooms(tenant_id);
CREATE INDEX idx_clinic_procedures_tenant_id ON clinic_procedures(tenant_id);
