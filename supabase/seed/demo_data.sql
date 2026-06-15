-- Demo clinic: 1 tenant, 2 users, 3 patients, 3 procedures, 1 room

BEGIN;

INSERT INTO master_tenants (id, slug, name, subscription_tier, max_users, max_patients, max_procedures_per_month, currency, currency_subunit, timezone, is_active)
VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'demo-clinic', 'عيادة النموذج التجريبي', 'professional', 10, 500, 2000, 'JOD', 1000, 'Asia/Amman', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO clinic_users (id, tenant_id, email, full_name, full_name_ar, role, employee_code, pin_code, is_active)
VALUES 
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@demo.jo', 'Ahmad Admin', 'أحمد الأدمن', 'clinic_admin', 'ADM001', '1234', TRUE),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'doctor@demo.jo', 'Dr. Sara', 'د. سارة', 'doctor', 'DOC001', '5678', TRUE),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'reception@demo.jo', 'Lina Reception', 'لينا الاستقبال', 'receptionist', 'REC001', '0000', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO clinic_rooms (id, tenant_id, name, code, is_active, capacity)
VALUES 
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Room 1 - Consultation', 'R01', TRUE, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO clinic_procedures (id, tenant_id, name, code, description, base_price_subunits, duration_minutes, is_active, category, taxonomy_id, is_custom)
VALUES 
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Advanced Skin Peel', 'ASP-01', 'Advanced chemical peel', 15000, 45, TRUE, 'non_surgical_cosmetic', NULL, TRUE),
('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Premium Botox', 'PBX-01', 'Premium botox injection', 12000, 20, TRUE, 'injectable', NULL, TRUE),
('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dental Cleaning Pro', 'DCP-01', 'Professional teeth cleaning', 8000, 30, TRUE, 'hygiene', NULL, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO clinic_patients (id, tenant_id, mrn, full_name, first_name, father_name, last_name, first_name_ar, father_name_ar, last_name_ar, phone, email, date_of_birth, gender, is_active)
VALUES 
('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MRN-001', 'Khaled Omar Hassan', 'Khaled', 'Omar', 'Hassan', 'خالد', 'عمر', 'حسن', '0791234567', 'khaled@email.com', '1985-03-15', 'male', TRUE),
('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MRN-002', 'Lina Ahmad Khalil', 'Lina', 'Ahmad', 'Khalil', 'لينا', 'أحمد', 'خليل', '0797654321', 'lina@email.com', '1992-07-22', 'female', TRUE),
('55555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MRN-003', 'Omar Khaled Suleiman', 'Omar', 'Khaled', 'Suleiman', 'عمر', 'خالد', 'سليمان', '0791111111', 'omar@email.com', '1978-11-05', 'male', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO master_agenda_events (id, tenant_id, resource_type, resource_id, event_type, start_at, end_at, patient_id, user_id, procedure_id, title, status)
VALUES 
('66666666-6666-6666-6666-666666666666', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'room', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'appointment', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '2 hour', '33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Khaled - Skin Peel', 'scheduled'),
('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'room', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'appointment', NOW() + INTERVAL '3 hour', NOW() + INTERVAL '4 hour', '44444444-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Lina - Botox', 'scheduled'),
('88888888-8888-8888-8888-888888888888', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'room', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'appointment', NOW() + INTERVAL '5 hour', NOW() + INTERVAL '6 hour', '55555555-5555-5555-5555-555555555555', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'Omar - Dental', 'scheduled')
ON CONFLICT (id) DO NOTHING;

INSERT INTO clinic_visit_sessions (id, tenant_id, patient_id, primary_doctor_id, assigned_room_id, agenda_event_id, procedure_id, scheduled_start, scheduled_end, actual_check_in, session_status, payment_status, base_charge_subunits, total_charge_subunits, is_insured)
VALUES 
('99999999-9999-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '66666666-6666-6666-6666-666666666666', 'ffffffff-ffff-ffff-ffff-ffffffffffff', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '2 hour', NOW() - INTERVAL '5 minutes', 'checked_in', 'pending', 15000, 15000, FALSE),
('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', NOW() + INTERVAL '3 hour', NOW() + INTERVAL '4 hour', NULL, 'pending', 'pending', 12000, 12000, TRUE),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '88888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222', NOW() + INTERVAL '5 hour', NOW() + INTERVAL '6 hour', NOW() - INTERVAL '2 minutes', 'in_progress', 'paid', 8000, 8000, FALSE)
ON CONFLICT (id) DO NOTHING;

COMMIT;
