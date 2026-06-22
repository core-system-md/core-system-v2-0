UPDATE clinic_visit_sessions
SET scheduled_start = NOW(),
    updated_at = NOW()
WHERE tenant_id = (SELECT id FROM master_tenants WHERE license_key = 'DEMO-LICENSE-2024');
