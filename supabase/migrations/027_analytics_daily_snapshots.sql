-- Restore the canonical analytics snapshot table to the replayable migration chain.
-- Evidence: the production database contains public.analytics_daily_snapshots,
-- while the checked-in migration chain has no table-creation migration before
-- migrations 034/038/044 reference it.
-- This is create-if-missing only; existing production schema is left unchanged.

CREATE TABLE IF NOT EXISTS public.analytics_daily_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.master_tenants(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_visits INTEGER DEFAULT 0,
    total_new_patients INTEGER DEFAULT 0,
    total_returning_patients INTEGER DEFAULT 0,
    total_no_shows INTEGER DEFAULT 0,
    total_cancellations INTEGER DEFAULT 0,
    avg_wait_time_minutes NUMERIC(5,1) DEFAULT 0,
    avg_session_duration_minutes NUMERIC(5,1) DEFAULT 0,
    avg_core_score NUMERIC(5,1) DEFAULT 0,
    total_revenue_subunits BIGINT DEFAULT 0,
    total_discounts_subunits INTEGER DEFAULT 0,
    sla_breaches_count INTEGER DEFAULT 0,
    hot_leads_count INTEGER DEFAULT 0,
    conversion_rate NUMERIC(5,2) DEFAULT 0,
    snapshot_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
