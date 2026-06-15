-- Master Tenants Table
-- Platform-level tenant management for multi-tenancy

CREATE TABLE master_tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    subscription_tier TEXT NOT NULL DEFAULT 'trial',
    max_users INTEGER NOT NULL DEFAULT 5,
    max_patients INTEGER NOT NULL DEFAULT 100,
    max_procedures_per_month INTEGER NOT NULL DEFAULT 500,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    settings JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT subscription_tier_check CHECK (subscription_tier IN ('trial', 'essential', 'professional', 'enterprise', 'suspended'))
);

-- Clinic Users Table
-- User accounts within tenant context

CREATE TABLE clinic_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES master_tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'receptionist',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT clinic_users_email_tenant_unique UNIQUE (tenant_id, email),
    CONSTRAINT clinic_users_role_check CHECK (role IN ('super_admin', 'clinic_admin', 'doctor', 'receptionist'))
);

CREATE INDEX idx_clinic_users_tenant_id ON clinic_users(tenant_id);
CREATE INDEX idx_clinic_users_email ON clinic_users(email);
