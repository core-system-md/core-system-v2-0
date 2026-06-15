-- Seed Data: Core Rules Configuration
-- Platform-wide business rules and configuration

INSERT INTO core_rules_config (key, category, value, description, is_active) VALUES
-- Scoring Weights
('scoring_patient_satisfaction_weight', 'scoring', '0.25', 'Weight for patient satisfaction in quality score calculation', TRUE),
('scoring_wait_time_weight', 'scoring', '0.20', 'Weight for average wait time in quality score calculation', TRUE),
('scoring_no_show_rate_weight', 'scoring', '0.15', 'Weight for no-show rate in quality score calculation', TRUE),
('scoring_abandoned_rate_weight', 'scoring', '0.15', 'Weight for abandoned session rate in quality score calculation', TRUE),
('scoring_session_complete_rate_weight', 'scoring', '0.15', 'Weight for session completion rate in quality score calculation', TRUE),
('scoring_revenue_per_session_weight', 'scoring', '0.10', 'Weight for revenue per session in financial health score', TRUE),

-- SLA Times (in minutes)
('sla_max_wait_time_minutes', 'sla', '30', 'Maximum acceptable wait time in minutes before quality impact', TRUE),
('sla_max_check_in_to_start_minutes', 'sla', '15', 'Maximum time from check-in to session start', TRUE),
('sla_session_reminder_hours', 'sla', '24', 'Hours before appointment to send reminder notification', TRUE),
('sla_session_reminder_final_hours', 'sla', '1', 'Hours before appointment to send final reminder', TRUE),
('sla_follow_up_target_days', 'sla', '7', 'Target days for post-procedure follow-up scheduling', TRUE),

-- Lock Abandonment Configuration
('lock_abandonment_timeout_minutes', 'workflow', '15', 'Minutes before an idle lock is automatically released', TRUE),
('session_auto_checkout_hours', 'workflow', '2', 'Hours after session end before auto-checkout if manual checkout skipped', TRUE),
('abandoned_session_grace_minutes', 'workflow', '10', 'Grace period before marking session as abandoned', TRUE),

-- Trial Configuration
('trial_duration_days', 'billing', '14', 'Default trial period duration in days for new tenants', TRUE),
('trial_max_users', 'billing', '3', 'Maximum users during trial period', TRUE),
('trial_max_patients', 'billing', '50', 'Maximum patients during trial period', TRUE),
('trial_max_procedures_month', 'billing', '100', 'Maximum procedures per month during trial', TRUE),

-- Patient Quality Score (PQS) Thresholds
('pqs_excellent_threshold', 'scoring', '4.5', 'PQS threshold for excellent rating', TRUE),
('pqs_good_threshold', 'scoring', '3.5', 'PQS threshold for good rating', TRUE),
('pqs_satisfactory_threshold', 'scoring', '2.5', 'PQS threshold for satisfactory rating', TRUE),
('pqs_needs_improvement_threshold', 'scoring', '1.5', 'PQS threshold for needs improvement rating', TRUE),

-- Notification Configuration
('notification_retry_attempts', 'notification', '3', 'Maximum retry attempts for failed notifications', TRUE),
('notification_retry_delay_seconds', 'notification', '300', 'Delay between notification retry attempts', TRUE),
('notification_expiry_hours', 'notification', '72', 'Hours before notification expires and is cleaned up', TRUE),

-- Retention Configuration
('retention_recall_days', 'retention', '90', 'Days after last visit to trigger recall follow-up', TRUE),
('retention_max_contact_attempts', 'retention', '5', 'Maximum contact attempts for follow-up', TRUE),
('retention_contact_spacing_hours', 'retention', '48', 'Minimum hours between contact attempts', TRUE),

-- Security Configuration  
('session_timeout_minutes', 'security', '60', 'Session timeout in minutes before requiring re-authentication', TRUE),
('max_login_attempts', 'security', '5', 'Maximum failed login attempts before lockout', TRUE),
('lockout_duration_minutes', 'security', '30', 'Account lockout duration in minutes', TRUE),
('password_min_length', 'security', '8', 'Minimum password length', TRUE),

-- Inventory Configuration
('inventory_low_stock_threshold', 'workflow', '10', 'Default low stock threshold for inventory alerts', TRUE),
('inventory_expiry_warning_days', 'workflow', '30', 'Days before expiry to trigger inventory alert', TRUE)
ON CONFLICT (key) DO NOTHING;

-- Seed Data: Feature Flags
-- Platform feature toggles for controlled rollout

INSERT INTO feature_flags (key, name, description, is_enabled, rollout_percentage, conditions) VALUES
('telehealth_integration', 'Telehealth Integration', 'Enable video consultation features and virtual appointments', FALSE, 0, '{}'),
('advanced_analytics', 'Advanced Analytics Dashboard', 'Enable advanced reporting and analytics features', TRUE, 100, '{}'),
('mobile_app_notifications', 'Mobile Push Notifications', 'Enable push notification delivery to mobile apps', TRUE, 100, '{}'),
('patient_self_service', 'Patient Self-Service Portal', 'Enable patient-facing self-service features (booking, intake forms)', TRUE, 100, '{}'),
('inventory_management', 'Inventory Management Module', 'Enable inventory tracking and management features', FALSE, 50, '{"skip_tenant_ids": []}'),
('ai_scheduling_assistant', 'AI Scheduling Assistant', 'Enable AI-powered scheduling optimization suggestions', FALSE, 25, '{"tenant_tiers": ["enterprise", "professional"]}')
ON CONFLICT (key) DO NOTHING;
