-- Feature Flags Table
-- Platform feature toggle management

CREATE TABLE feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    rollout_percentage INTEGER NOT NULL DEFAULT 0,
    conditions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT feature_flags_rollout_check CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100)
);

-- Analytics Events Table
-- Platform-wide analytics and tracking

CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES master_tenants(id) ON DELETE SET NULL,
    user_id UUID REFERENCES clinic_users(id) ON DELETE SET NULL,
    
    -- Event details
    event_name TEXT NOT NULL,
    event_category TEXT NOT NULL,
    
    -- Context
    session_id UUID REFERENCES clinic_visit_sessions(id) ON DELETE SET NULL,
    entity_type TEXT,
    entity_id UUID,
    
    -- Data
    properties JSONB DEFAULT '{}',
    
    -- Metadata
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_hash TEXT,
    user_agent_hash TEXT,
    
    CONSTRAINT analytics_events_category_check CHECK (event_category IN ('auth', 'scheduling', 'session', 'billing', 'patient', 'inventory', 'performance', 'error', 'audit', 'other'))
);

-- Core Rules Config Table
-- Platform-wide configuration and business rules

CREATE TABLE core_rules_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT core_rules_config_category_check CHECK (category IN ('scoring', 'sla', 'billing', 'retention', 'security', 'workflow', 'notification', 'other'))
);

-- Tenant Health Scores Table
-- Tracks health metrics for each tenant

CREATE TABLE tenant_health_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES master_tenants(id) ON DELETE CASCADE,
    
    -- Score components (0-100 scale)
    quality_score INTEGER NOT NULL DEFAULT 0,
    reliability_score INTEGER NOT NULL DEFAULT 0,
    financial_health_score INTEGER NOT NULL DEFAULT 0,
    growth_score INTEGER NOT NULL DEFAULT 0,
    overall_score INTEGER NOT NULL DEFAULT 0,
    
    -- Metrics snapshot
    total_patients_lifetime INTEGER NOT NULL DEFAULT 0,
    total_sessions_lifetime INTEGER NOT NULL DEFAULT 0,
    total_revenue_lifetime_fils INTEGER NOT NULL DEFAULT 0,
    -- FILS ONLY: 1 JOD = 1000 fils. Never FLOAT/DECIMAL.
    
    -- Period
    score_period TEXT NOT NULL,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT tenant_health_scores_period_check CHECK (score_period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    CONSTRAINT tenant_health_scores_score_range CHECK (overall_score >= 0 AND overall_score <= 100),
    CONSTRAINT tenant_health_scores_tenant_period_unique UNIQUE (tenant_id, score_period, calculated_at)
);

-- Notification Queue Table
-- Platform notification management

CREATE TABLE notification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES master_tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES clinic_users(id) ON DELETE CASCADE,
    
    -- Notification details
    notification_type TEXT NOT NULL,
    channel TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal',
    
    -- Content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Payload
    payload JSONB DEFAULT '{}',
    entity_type TEXT,
    entity_id UUID,
    
    -- Delivery tracking
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    last_attempt_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    
    -- Scheduling
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Audit
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT notification_queue_type_check CHECK (notification_type IN ('session_reminder', 'appointment_confirmation', 'payment_due', 'system_alert', 'marketing', 'security_alert', 'task_reminder', 'custom')),
    CONSTRAINT notification_queue_channel_check CHECK (channel IN ('email', 'sms', 'push', 'in_app', 'whatsapp')),
    CONSTRAINT notification_queue_priority_check CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    CONSTRAINT notification_queue_status_check CHECK (status IN ('pending', 'processing', 'sent', 'delivered', 'failed', 'cancelled', 'expired'))
);

-- Billing Events Table
-- Platform billing and subscription tracking
-- FILS ONLY: 1 JOD = 1000 fils. Never FLOAT/DECIMAL.

CREATE TABLE billing_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES master_tenants(id) ON DELETE CASCADE,
    
    -- Event details
    event_type TEXT NOT NULL,
    invoice_number TEXT,
    
    -- Financial amounts (all in fils)
    -- FILS ONLY: 1 JOD = 1000 fils. Never FLOAT/DECIMAL.
    amount_fils INTEGER NOT NULL DEFAULT 0,
    -- FILS ONLY: 1 JOD = 1000 fils. Never FLOAT/DECIMAL.
    tax_fils INTEGER NOT NULL DEFAULT 0,
    -- FILS ONLY: 1 JOD = 1000 fils. Never FLOAT/DECIMAL.
    discount_fils INTEGER NOT NULL DEFAULT 0,
    -- FILS ONLY: 1 JOD = 1000 fils. Never FLOAT/DECIMAL.
    total_fils INTEGER NOT NULL DEFAULT 0,
    -- FILS ONLY: 1 JOD = 1000 fils. Never FLOAT/DECIMAL.
    credits_applied_fils INTEGER NOT NULL DEFAULT 0,
    -- FILS ONLY: 1 JOD = 1000 fils. Never FLOAT/DECIMAL.
    balance_fils INTEGER NOT NULL DEFAULT 0,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending',
    reason TEXT,
    description TEXT,
    
    -- Payment
    payment_method TEXT,
    payment_reference TEXT,
    payment_provider TEXT,
    
    -- Dates
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT billing_events_type_check CHECK (event_type IN ('subscription', 'usage', 'overage', 'refund', 'credit', 'adjustment', 'trial_start', 'trial_end', 'upgrade', 'downgrade', 'cancellation', 'renewal')),
    CONSTRAINT billing_events_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'disputed'))
);

CREATE INDEX idx_feature_flags_key ON feature_flags(key);
CREATE INDEX idx_analytics_events_tenant_id ON analytics_events(tenant_id);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_occurred_at ON analytics_events(occurred_at);
CREATE INDEX idx_core_rules_config_key ON core_rules_config(key);
CREATE INDEX idx_core_rules_config_category ON core_rules_config(category);
CREATE INDEX idx_tenant_health_scores_tenant_id ON tenant_health_scores(tenant_id);
CREATE INDEX idx_notification_queue_tenant_id ON notification_queue(tenant_id);
CREATE INDEX idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX idx_notification_queue_status ON notification_queue(status);
CREATE INDEX idx_notification_queue_scheduled_at ON notification_queue(scheduled_at);
CREATE INDEX idx_billing_events_tenant_id ON billing_events(tenant_id);
CREATE INDEX idx_billing_events_type ON billing_events(event_type);
CREATE INDEX idx_billing_events_status ON billing_events(status);
CREATE INDEX idx_billing_events_occurred_at ON billing_events(occurred_at);
