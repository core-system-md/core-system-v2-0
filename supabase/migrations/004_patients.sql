-- Clinic Patients Table
-- Patient records within tenant context

CREATE TABLE clinic_patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES master_tenants(id) ON DELETE CASCADE,
    mrn TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    date_of_birth DATE,
    gender TEXT,
    address TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    medical_history_notes TEXT,
    allergies TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT clinic_patients_mrn_tenant_unique UNIQUE (tenant_id, mrn),
    CONSTRAINT clinic_patients_gender_check CHECK (gender IS NULL OR gender IN ('male', 'female', 'other', 'prefer_not_to_say'))
);

-- Patient Longitudinal Profiles Table
-- Tracks patient health metrics over time

CREATE TABLE patient_longitudinal_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES clinic_patients(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES master_tenants(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    weight_kg DECIMAL(5,2),
    height_cm DECIMAL(5,2),
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    heart_rate_bpm INTEGER,
    blood_glucose_mg_dl INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_blood_pressure CHECK (
        blood_pressure_systolic IS NULL OR 
        blood_pressure_diastolic IS NULL OR 
        blood_pressure_systolic > blood_pressure_diastolic
    )
);

CREATE INDEX idx_clinic_patients_tenant_id ON clinic_patients(tenant_id);
CREATE INDEX idx_clinic_patients_mrn ON clinic_patients(mrn);
CREATE INDEX idx_clinic_patients_phone ON clinic_patients(phone);
CREATE INDEX idx_patient_longitudinal_patient_id ON patient_longitudinal_profiles(patient_id);
CREATE INDEX idx_patient_longitudinal_tenant_id ON patient_longitudinal_profiles(tenant_id);
