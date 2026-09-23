-- P54: Align compute_daily_snapshot with Blueprint Section 18 analytics snapshot contract.
-- The prior RPC returned only four legacy keys while analytics-snapshot expects the
-- complete analytics_daily_snapshots field set. No schema changes are introduced.

CREATE OR REPLACE FUNCTION public.compute_daily_snapshot(
  p_tenant_id UUID,
  p_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  WITH day_sessions AS (
    SELECT s.*
    FROM public.clinic_visit_sessions s
    WHERE s.tenant_id = p_tenant_id
      AND DATE(s.created_at) = p_date
      AND s.deleted_at IS NULL
  ),
  session_financials AS (
    SELECT
      i.session_id,
      COALESCE(SUM(i.total_subunits), 0) AS total_revenue_subunits,
      COALESCE(SUM(i.discount_subunits), 0) AS total_discounts_subunits
    FROM public.clinic_invoices i
    WHERE i.tenant_id = p_tenant_id
      AND i.deleted_at IS NULL
      AND i.session_id IN (SELECT id FROM day_sessions)
    GROUP BY i.session_id
  ),
  session_metrics AS (
    SELECT
      COUNT(*)::INTEGER AS total_visits,
      COUNT(*) FILTER (WHERE ds.patient_id IS NOT NULL AND p.first_visit_date = p_date)::INTEGER AS total_new_patients,
      COUNT(*) FILTER (WHERE ds.patient_id IS NOT NULL AND (p.first_visit_date IS NULL OR p.first_visit_date < p_date))::INTEGER AS total_returning_patients,
      COUNT(*) FILTER (WHERE ds.session_status = 'no_show')::INTEGER AS total_no_shows,
      COUNT(*) FILTER (WHERE ds.session_status = 'cancelled')::INTEGER AS total_cancellations,
      COALESCE(AVG(ds.waiting_time_minutes), 0)::NUMERIC AS avg_wait_time_minutes,
      COALESCE(AVG(ds.session_duration_minutes), 0)::NUMERIC AS avg_session_duration_minutes,
      COALESCE(AVG(ds.core_score_display), 0)::NUMERIC AS avg_core_score,
      COALESCE(SUM(sf.total_revenue_subunits), 0)::BIGINT AS total_revenue_subunits,
      COALESCE(SUM(sf.total_discounts_subunits), 0)::BIGINT AS total_discounts_subunits,
      COUNT(*) FILTER (WHERE ds.waiting_time_minutes IS NOT NULL AND ds.waiting_time_minutes >= 25)::INTEGER AS sla_breaches_count,
      COUNT(*) FILTER (WHERE ds.patient_class = 'hot_lead')::INTEGER AS hot_leads_count
    FROM day_sessions ds
    LEFT JOIN public.clinic_patients p ON p.id = ds.patient_id
    LEFT JOIN session_financials sf ON sf.session_id = ds.id
  ),
  inquiry_metrics AS (
    SELECT
      COUNT(*)::NUMERIC AS total_inquiries,
      COUNT(*) FILTER (WHERE status = 'converted_to_session')::NUMERIC AS converted_inquiries
    FROM public.clinic_inquiries
    WHERE tenant_id = p_tenant_id
      AND DATE(created_at) = p_date
  )
  SELECT json_build_object(
    'total_visits', sm.total_visits,
    'total_new_patients', sm.total_new_patients,
    'total_returning_patients', sm.total_returning_patients,
    'total_no_shows', sm.total_no_shows,
    'total_cancellations', sm.total_cancellations,
    'avg_wait_time_minutes', ROUND(sm.avg_wait_time_minutes, 1),
    'avg_session_duration_minutes', ROUND(sm.avg_session_duration_minutes, 1),
    'avg_core_score', ROUND(sm.avg_core_score, 1),
    'total_revenue_subunits', sm.total_revenue_subunits,
    'total_discounts_subunits', sm.total_discounts_subunits,
    'sla_breaches_count', sm.sla_breaches_count,
    'hot_leads_count', sm.hot_leads_count,
    'conversion_rate', CASE
      WHEN im.total_inquiries = 0 THEN 0
      ELSE ROUND((im.converted_inquiries / im.total_inquiries) * 100, 2)
    END
  ) INTO v_result
  FROM session_metrics sm
  CROSS JOIN inquiry_metrics im;

  RETURN v_result;
END;
$$;
