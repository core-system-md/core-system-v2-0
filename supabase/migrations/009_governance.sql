-- System Delivery Breaches Table
-- Tracks platform SLA and delivery violations

CREATE TABLE system_delivery_breaches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES master_tenants(id) ON DELETE CASCADE,
    
    -- Breach identification
    breach_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium',
    
    -- Related entity
    entity_type TEXT NOT NULL,
    entity_id UUID,
    session_id UUID REFERENCES clinic_visit_sessions(id) ON DELETE SET NULL,
    
    -- Timing
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    
    -- Details
    description TEXT NOT NULL,
    impact TEXT,
    root_cause TEXT,
    resolution TEXT,
    
    -- Metrics
    duration_seconds INTEGER,
    affected_records INTEGER DEFAULT 0,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'open',
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT system_delivery_breaches_type_check CHECK (breach_type IN ('sla_violation', 'wait_time_exceeded', 'session_abandoned', 'payment_failure', 'data_loss', 'availability', 'security', 'other')),
    CONSTRAINT system_delivery_breaches_severity_check CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT system_delivery_breaches_entity_type_check CHECK (entity_type IN ('session', 'patient', 'invoice', 'agenda_event', 'system', 'tenant')),
    CONSTRAINT system_delivery_breaches_status_check CHECK (status IN ('open', 'investigating', 'resolved', 'closed', 'ignored'))
);

-- Audit Trail Table
-- Comprehensive audit logging for compliance

CREATE TABLE audit_trail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES master_tenants(id) ON DELETE SET NULL,
    
    -- Actor
    user_id UUID REFERENCES clinic_users(id) ON DELETE SET NULL,
    actor_type TEXT NOT NULL,
    actor_email TEXT,
    
    -- Action
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    
    -- Changes
    old_values JSONB DEFAULT '{}',
    new_values JSONB DEFAULT '{}',
    changed_fields TEXT[],
    
    -- Context
    ip_address TEXT,
    user_agent TEXT,
    request_id TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT audit_trail_actor_type_check CHECK (actor_type IN ('user', 'system', 'api', 'integration', 'scheduled_task')),
    CONSTRAINT audit_trail_action_check CHECK (action IN ('create', 'update', 'delete', 'login', 'logout', 'export', 'import', 'view', 'other'))
);

-- Tenant Devices Table
-- Registered devices for secure access

CREATE TABLE tenant_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES master_tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES clinic_users(id) ON DELETE CASCADE,
    
    -- Device identification
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL,
    device_fingerprint TEXT NOT NULL,
    
    -- Session info
    last_used_at TIMESTAMPTZ,
    last_ip TEXT,
    
    -- Status
    is_trusted BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Metadata
    os_info TEXT,
    browser_info TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT tenant_devices_device_type_check CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'kiosk', 'other')),
    CONSTRAINT tenant_devices_fingerprint_tenant_unique UNIQUE (tenant_id, device_fingerprint)
);

CREATE INDEX idx_system_delivery_breaches_tenant_id ON system_delivery_breaches(tenant_id);
CREATE INDEX idx_system_delivery_breaches_type ON system_delivery_breaches(breach_type);
CREATE INDEX idx_system_delivery_breaches_session_id ON system_delivery_breaches(session_id);
CREATE INDEX idx_system_delivery_breaches_occurred_at ON system_delivery_breaches(occurred_at);
CREATE INDEX idx_audit_trail_tenant_id ON audit_trail(tenant_id);
CREATE INDEX idx_audit_trail_user_id ON audit_trail(user_id);
CREATE INDEX idx_audit_trail_entity ON audit_trail(entity_type, entity_id);
CREATE INDEX idx_audit_trail_action ON audit_trail(action);
CREATE INDEX idx_audit_trail_created_at ON audit_trail(created_at);
CREATE INDEX idx_tenant_devices_tenant_id ON tenant_devices(tenant_id);
CREATE INDEX idx_tenant_devices_user_id ON tenant_devices(user_id);
