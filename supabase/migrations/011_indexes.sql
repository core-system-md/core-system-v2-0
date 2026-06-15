-- Performance Indexes
-- Composite and specialized indexes for query optimization

-- Sessions analytics indexes
CREATE INDEX idx_clinic_visit_sessions_tenant_status_date 
    ON clinic_visit_sessions(tenant_id, session_status, scheduled_start DESC);
    
CREATE INDEX idx_clinic_visit_sessions_tenant_doctor_status 
    ON clinic_visit_sessions(tenant_id, primary_doctor_id, session_status);
    
CREATE INDEX idx_clinic_visit_sessions_patient_status 
    ON clinic_visit_sessions(patient_id, session_status, actual_check_in DESC);

CREATE INDEX idx_clinic_visit_sessions_tenant_payment 
    ON clinic_visit_sessions(tenant_id, payment_status, created_at DESC);

CREATE INDEX idx_clinic_visit_sessions_abandoned 
    ON clinic_visit_sessions(tenant_id, is_abandoned, abandoned_at DESC) 
    WHERE is_abandoned = TRUE;

-- Agenda events composite indexes
CREATE INDEX idx_master_agenda_events_tenant_dates 
    ON master_agenda_events(tenant_id, start_at, end_at);
    
CREATE INDEX idx_master_agenda_events_tenant_status_dates 
    ON master_agenda_events(tenant_id, status, start_at, end_at);

CREATE INDEX idx_master_agenda_events_resource_dates 
    ON master_agenda_events(resource_type, resource_id, start_at, end_at);

CREATE INDEX idx_master_agenda_events_tenant_patient_dates 
    ON master_agenda_events(tenant_id, patient_id, start_at, end_at) 
    WHERE patient_id IS NOT NULL;

-- Invoices composite indexes
CREATE INDEX idx_clinic_invoices_tenant_status_date 
    ON clinic_invoices(tenant_id, status, due_at DESC);
    
CREATE INDEX idx_clinic_invoices_patient_unpaid 
    ON clinic_invoices(patient_id, status, total_fils) 
    WHERE status IN ('draft', 'issued', 'partial', 'overdue');

CREATE INDEX idx_clinic_invoices_tenant_overdue 
    ON clinic_invoices(tenant_id, due_at) 
    WHERE status = 'overdue';

-- Analytics aggregation indexes
CREATE INDEX idx_analytics_events_tenant_category_date 
    ON analytics_events(tenant_id, event_category, occurred_at DESC);
    
CREATE INDEX idx_analytics_events_tenant_name_date 
    ON analytics_events(tenant_id, event_name, occurred_at DESC);

CREATE INDEX idx_analytics_events_session 
    ON analytics_events(session_id, event_name, occurred_at) 
    WHERE session_id IS NOT NULL;

-- Audit trail indexes for reporting
CREATE INDEX idx_audit_trail_tenant_action_date 
    ON audit_trail(tenant_id, action, created_at DESC);

CREATE INDEX idx_audit_trail_user_date 
    ON audit_trail(user_id, created_at DESC);

CREATE INDEX idx_audit_trail_entity_action 
    ON audit_trail(entity_type, entity_id, action, created_at DESC);

-- Tenant health scores indexes
CREATE INDEX idx_tenant_health_scores_overall 
    ON tenant_health_scores(tenant_id, overall_score DESC, calculated_at DESC);

CREATE INDEX idx_tenant_health_scores_period_calc 
    ON tenant_health_scores(score_period, calculated_at DESC);

-- Notification queue indexes
CREATE INDEX idx_notification_queue_status_scheduled 
    ON notification_queue(status, scheduled_at) 
    WHERE status = 'pending';
    
CREATE INDEX idx_notification_queue_tenant_pending 
    ON notification_queue(tenant_id, status, scheduled_at) 
    WHERE status IN ('pending', 'processing');

CREATE INDEX idx_notification_queue_user_unread 
    ON notification_queue(user_id, created_at DESC) 
    WHERE status = 'delivered' AND read_at IS NULL;

-- Retention followup indexes
CREATE INDEX idx_retention_followups_tenant_status_date 
    ON retention_followups(tenant_id, status, scheduled_date, scheduled_time);
    
CREATE INDEX idx_retention_followups_pending_date 
    ON retention_followups(tenant_id, scheduled_date) 
    WHERE status = 'pending';

CREATE INDEX idx_retention_followups_assigned 
    ON retention_followups(assigned_to, status, scheduled_date);

-- Billing events indexes
CREATE INDEX idx_billing_events_tenant_type_date 
    ON billing_events(tenant_id, event_type, occurred_at DESC);

CREATE INDEX idx_billing_events_tenant_pending 
    ON billing_events(tenant_id, status, due_at) 
    WHERE status IN ('pending', 'processing');

-- Breach tracking indexes
CREATE INDEX idx_system_delivery_breaches_tenant_severity 
    ON system_delivery_breaches(tenant_id, severity, occurred_at DESC) 
    WHERE status != 'closed';

CREATE INDEX idx_system_delivery_breaches_type_status 
    ON system_delivery_breaches(breach_type, status, detected_at DESC);

-- Patient search indexes
CREATE INDEX idx_clinic_patients_tenant_name 
    ON clinic_patients(tenant_id, full_name);

CREATE INDEX idx_clinic_patients_tenant_email 
    ON clinic_patients(tenant_id, email) 
    WHERE email IS NOT NULL;

-- Procedure search by category
CREATE INDEX idx_clinic_procedures_tenant_category 
    ON clinic_procedures(tenant_id, category, is_active);

-- Inventory ledger batch tracking
CREATE INDEX idx_inventory_ledger_expiry 
    ON inventory_ledger(tenant_id, expiry_date) 
    WHERE expiry_date IS NOT NULL;

CREATE INDEX idx_inventory_ledger_batch 
    ON inventory_ledger(tenant_id, batch_number) 
    WHERE batch_number IS NOT NULL;

-- Partial indexes for active records
CREATE INDEX idx_clinic_users_tenant_active 
    ON clinic_users(tenant_id, email) 
    WHERE is_active = TRUE;

CREATE INDEX idx_clinic_rooms_tenant_active 
    ON clinic_rooms(tenant_id, name) 
    WHERE is_active = TRUE;

CREATE INDEX idx_clinic_procedures_tenant_active 
    ON clinic_procedures(tenant_id, name) 
    WHERE is_active = TRUE;

CREATE INDEX idx_clinic_patients_tenant_active 
    ON clinic_patients(tenant_id, full_name) 
    WHERE is_active = TRUE;
