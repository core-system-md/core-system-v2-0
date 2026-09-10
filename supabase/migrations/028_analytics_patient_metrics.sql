-- Restore the canonical patient metrics table to the replayable migration chain.
-- Evidence: Production contains public.analytics_patient_metrics, while the
-- checked-in migration chain reaches later migrations that ALTER this table
-- without a prior table-creation migration.
-- Create-if-missing only; existing Production schema is left unchanged.

CREATE TABLE IF NOT EXISTS public.analytics_patient_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.master_tenants(id),
    metric_period VARCHAR(20) NOT NULL
        CHECK (metric_period IN ('weekly', 'monthly', 'quarterly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    new_patients INTEGER DEFAULT 0,
    reactivated_patients INTEGER DEFAULT 0,
    churned_patients INTEGER DEFAULT 0,
    avg_ltv_subunits BIGINT DEFAULT 0,
    avg_disc_distribution JSONB DEFAULT '{}',
    top_procedures JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
