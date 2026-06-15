-- Row Level Security Configuration
-- Enable RLS on all tables and create helper functions + policies

-- RLS Helper Functions
CREATE OR REPLACE FUNCTION auth.tenant_id() RETURNS UUID 
    LANGUAGE SQL STABLE PARALLEL SAFE 
RETURN NULLIF(CURRENT_SETTING('app.current_tenant', TRUE)::TEXT, '')::UUID;

CREATE OR REPLACE FUNCTION auth.is_super_admin() RETURNS BOOLEAN 
    LANGUAGE SQL STABLE PARALLEL SAFE 
RETURN NULLIF(CURRENT_SETTING('app.is_super_admin', TRUE)::TEXT, '')::BOOLEAN;

-- Enable RLS on all tables

ALTER TABLE master_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_longitudinal_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_agenda_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_visit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_intake_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_delivery_breaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_rules_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

-- POLICY 1: Master Tenants - Platform admin access only
CREATE POLICY "tenants_super_admin_select" ON master_tenants 
    FOR SELECT TO authenticated 
    USING (auth.is_super_admin() = TRUE);

CREATE POLICY "tenants_super_admin_insert" ON master_tenants 
    FOR INSERT TO authenticated 
    WITH CHECK (auth.is_super_admin() = TRUE);

CREATE POLICY "tenants_super_admin_update" ON master_tenants 
    FOR UPDATE TO authenticated 
    USING (auth.is_super_admin() = TRUE);

CREATE POLICY "tenants_super_admin_delete" ON master_tenants 
    FOR DELETE TO authenticated 
    USING (auth.is_super_admin() = TRUE);

-- POLICY 2: Clinic Users - Own tenant only
CREATE POLICY "clinic_users_select_tenant" ON clinic_users 
    FOR SELECT TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "clinic_users_insert_tenant" ON clinic_users 
    FOR INSERT TO authenticated 
    WITH CHECK ((tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE));

CREATE POLICY "clinic_users_update_tenant" ON clinic_users 
    FOR UPDATE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "clinic_users_delete_tenant" ON clinic_users 
    FOR DELETE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

-- POLICY 3: Clinical Resources (Rooms, Procedures) - Own tenant only
CREATE POLICY "clinical_resources_select" ON clinic_rooms 
    FOR SELECT TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "clinical_resources_insert" ON clinic_rooms 
    FOR INSERT TO authenticated 
    WITH CHECK ((tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE));

CREATE POLICY "clinical_resources_update" ON clinic_rooms 
    FOR UPDATE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "clinical_resources_delete" ON clinic_rooms 
    FOR DELETE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "procedures_select" ON clinic_procedures 
    FOR SELECT TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "procedures_insert" ON clinic_procedures 
    FOR INSERT TO authenticated 
    WITH CHECK ((tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE));

CREATE POLICY "procedures_update" ON clinic_procedures 
    FOR UPDATE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "procedures_delete" ON clinic_procedures 
    FOR DELETE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

-- POLICY 4: Patient Records - Own tenant only
CREATE POLICY "patients_select" ON clinic_patients 
    FOR SELECT TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "patients_insert" ON clinic_patients 
    FOR INSERT TO authenticated 
    WITH CHECK ((tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE));

CREATE POLICY "patients_update" ON clinic_patients 
    FOR UPDATE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "patients_delete" ON clinic_patients 
    FOR DELETE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "patient_profiles_select" ON patient_longitudinal_profiles 
    FOR SELECT TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "patient_profiles_insert" ON patient_longitudinal_profiles 
    FOR INSERT TO authenticated 
    WITH CHECK ((tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE));

CREATE POLICY "patient_profiles_update" ON patient_longitudinal_profiles 
    FOR UPDATE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "patient_profiles_delete" ON patient_longitudinal_profiles 
    FOR DELETE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

-- POLICY 5: Inquiry & Scheduling - Own tenant only
CREATE POLICY "inquiries_select" ON clinic_inquiries 
    FOR SELECT TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "inquiries_insert" ON clinic_inquiries 
    FOR INSERT TO authenticated 
    WITH CHECK ((tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE));

CREATE POLICY "inquiries_update" ON clinic_inquiries 
    FOR UPDATE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "inquiries_delete" ON clinic_inquiries 
    FOR DELETE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "agenda_events_select" ON master_agenda_events 
    FOR SELECT TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "agenda_events_insert" ON master_agenda_events 
    FOR INSERT TO authenticated 
    WITH CHECK ((tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE));

CREATE POLICY "agenda_events_update" ON master_agenda_events 
    FOR UPDATE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "agenda_events_delete" ON master_agenda_events 
    FOR DELETE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

-- POLICY 6: Visit Sessions - Own tenant only
CREATE POLICY "visit_sessions_select" ON clinic_visit_sessions 
    FOR SELECT TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "visit_sessions_insert" ON clinic_visit_sessions 
    FOR INSERT TO authenticated 
    WITH CHECK ((tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE));

CREATE POLICY "visit_sessions_update" ON clinic_visit_sessions 
    FOR UPDATE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "visit_sessions_delete" ON clinic_visit_sessions 
    FOR DELETE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

-- POLICY 7: Financial Records - Own tenant only
CREATE POLICY "invoices_select" ON clinic_invoices 
    FOR SELECT TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "invoices_insert" ON clinic_invoices 
    FOR INSERT TO authenticated 
    WITH CHECK ((tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE));

CREATE POLICY "invoices_update" ON clinic_invoices 
    FOR UPDATE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "invoices_delete" ON clinic_invoices 
    FOR DELETE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "inventory_select" ON inventory_ledger 
    FOR SELECT TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "inventory_insert" ON inventory_ledger 
    FOR INSERT TO authenticated 
    WITH CHECK ((tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE));

CREATE POLICY "inventory_update" ON inventory_ledger 
    FOR UPDATE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "inventory_delete" ON inventory_ledger 
    FOR DELETE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

-- POLICY 8: Retention & Intake - Own tenant only
CREATE POLICY "followups_select" ON retention_followups 
    FOR SELECT TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "followups_insert" ON retention_followups 
    FOR INSERT TO authenticated 
    WITH CHECK ((tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE));

CREATE POLICY "followups_update" ON retention_followups 
    FOR UPDATE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "followups_delete" ON retention_followups 
    FOR DELETE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "intake_select" ON patient_intake_responses 
    FOR SELECT TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "intake_insert" ON patient_intake_responses 
    FOR INSERT TO authenticated 
    WITH CHECK ((tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE));

CREATE POLICY "intake_update" ON patient_intake_responses 
    FOR UPDATE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "intake_delete" ON patient_intake_responses 
    FOR DELETE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

-- POLICY 9: Governance Tables - Super admin or own tenant
CREATE POLICY "breaches_select" ON system_delivery_breaches 
    FOR SELECT TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "breaches_insert" ON system_delivery_breaches 
    FOR INSERT TO authenticated 
    WITH CHECK ((tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE));

CREATE POLICY "breaches_update" ON system_delivery_breaches 
    FOR UPDATE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "breaches_delete" ON system_delivery_breaches 
    FOR DELETE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "audit_select" ON audit_trail 
    FOR SELECT TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "audit_insert" ON audit_trail 
    FOR INSERT TO authenticated 
    WITH CHECK ((tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE));

CREATE POLICY "audit_update" ON audit_trail 
    FOR UPDATE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "audit_delete" ON audit_trail 
    FOR DELETE TO authenticated 
    USING (auth.is_super_admin() = TRUE);

CREATE POLICY "devices_select" ON tenant_devices 
    FOR SELECT TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "devices_insert" ON tenant_devices 
    FOR INSERT TO authenticated 
    WITH CHECK ((tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE));

CREATE POLICY "devices_update" ON tenant_devices 
    FOR UPDATE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "devices_delete" ON tenant_devices 
    FOR DELETE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

-- POLICY 10: Feature Flags - Global read, admin write
CREATE POLICY "flags_select" ON feature_flags 
    FOR SELECT TO authenticated 
    USING (TRUE);

CREATE POLICY "flags_insert" ON feature_flags 
    FOR INSERT TO authenticated 
    WITH CHECK (auth.is_super_admin() = TRUE);

CREATE POLICY "flags_update" ON feature_flags 
    FOR UPDATE TO authenticated 
    USING (auth.is_super_admin() = TRUE);

CREATE POLICY "flags_delete" ON feature_flags 
    FOR DELETE TO authenticated 
    USING (auth.is_super_admin() = TRUE);

-- POLICY 11: Analytics Events - Insert only for normal users
CREATE POLICY "analytics_select" ON analytics_events 
    FOR SELECT TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "analytics_insert" ON analytics_events 
    FOR INSERT TO authenticated 
    WITH CHECK ((tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE));

CREATE POLICY "analytics_delete" ON analytics_events 
    FOR DELETE TO authenticated 
    USING (auth.is_super_admin() = TRUE);

-- POLICY 12: Platform Config & Health Scores - Admin access
CREATE POLICY "rules_config_select" ON core_rules_config 
    FOR SELECT TO authenticated 
    USING (TRUE);

CREATE POLICY "rules_config_insert" ON core_rules_config 
    FOR INSERT TO authenticated 
    WITH CHECK (auth.is_super_admin() = TRUE);

CREATE POLICY "rules_config_update" ON core_rules_config 
    FOR UPDATE TO authenticated 
    USING (auth.is_super_admin() = TRUE);

CREATE POLICY "rules_config_delete" ON core_rules_config 
    FOR DELETE TO authenticated 
    USING (auth.is_super_admin() = TRUE);

CREATE POLICY "health_scores_select" ON tenant_health_scores 
    FOR SELECT TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "health_scores_insert" ON tenant_health_scores 
    FOR INSERT TO authenticated 
    WITH CHECK ((tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE));

CREATE POLICY "health_scores_update" ON tenant_health_scores 
    FOR UPDATE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "health_scores_delete" ON tenant_health_scores 
    FOR DELETE TO authenticated 
    USING (auth.is_super_admin() = TRUE);

-- POLICY 13: Notifications & Billing - Own tenant only
CREATE POLICY "notifications_select" ON notification_queue 
    FOR SELECT TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "notifications_insert" ON notification_queue 
    FOR INSERT TO authenticated 
    WITH CHECK ((tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE));

CREATE POLICY "notifications_update" ON notification_queue 
    FOR UPDATE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "notifications_delete" ON notification_queue 
    FOR DELETE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "billing_select" ON billing_events 
    FOR SELECT TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "billing_insert" ON billing_events 
    FOR INSERT TO authenticated 
    WITH CHECK ((tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE));

CREATE POLICY "billing_update" ON billing_events 
    FOR UPDATE TO authenticated 
    USING (tenant_id = auth.tenant_id() OR auth.is_super_admin() = TRUE);

CREATE POLICY "billing_delete" ON billing_events 
    FOR DELETE TO authenticated 
    USING (auth.is_super_admin() = TRUE);
