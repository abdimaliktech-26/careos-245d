-- ============================================================
-- Stillwater 245D Suite — Demo Seed Data
-- ============================================================
-- Run AFTER 003_form_templates.sql
--
-- IMPORTANT: Replace the UUIDs marked with <<AUTH-USER-ID-HERE>>
-- with real Supabase Auth user IDs from your project.
-- Create these users in Supabase Auth first (email/password or magic link),
-- then copy their UUIDs here.
--
-- Or run this via the seed.ts script which handles auth user creation.
-- ============================================================

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

INSERT INTO organizations (id, name, license_number, ein, npi, medicaid_id, medicare_id, address, city, state, zip, phone, email, website, timezone, default_hourly_rate, plan)
VALUES
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Northern Lights 245D Services',
    'MN-245D-00142',
    '41-1234567',
    '1234567890',
    'MN-123456-01',
    'MED-987654',
    '1400 Energy Park Dr Suite 15',
    'Saint Paul', 'MN', '55108',
    '651-555-0101',
    'admin@northernlights245d.com',
    'https://northernlights245d.com',
    'America/Chicago',
    45.00,
    'pro'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000002',
    'Lakeside Community Support Services',
    'MN-245D-00287',
    '41-7654321',
    '0987654321',
    'MN-654321-01',
    'MED-123456',
    '2800 University Ave SE',
    'Minneapolis', 'MN', '55414',
    '612-555-0202',
    'admin@lakesidecss.com',
    'https://lakesidecss.org',
    'America/Chicago',
    40.00,
    'starter'
  );

-- ============================================================
-- NOTE: Organization members require real auth.users IDs.
-- The seed.ts script inserts demo members. If running SQL directly,
-- create auth users first and replace placeholders below.
-- ============================================================

-- Demo placeholder: if you have a Supabase user already, uncomment + replace:
-- INSERT INTO organization_members (organization_id, user_id, role, full_name, email)
-- VALUES (
--   'aaaaaaaa-0000-0000-0000-000000000001',
--   '<<YOUR-SUPABASE-USER-UUID>>',
--   'super_admin',
--   'Demo Admin',
--   'demo@northernlights245d.com'
-- );

-- ============================================================
-- CLIENTS — Northern Lights organization
-- ============================================================

INSERT INTO clients (
  id, organization_id,
  legal_name, preferred_name, date_of_birth, gender, primary_language,
  home_address, city, state, zip, phone,
  program, waiver_type, medicaid_number, county_of_service, service_start_date, intake_date,
  case_manager_name, case_manager_agency, case_manager_phone,
  guardianship_status,
  status
)
VALUES
  (
    'cccccccc-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Aisha Patel', 'Aisha',
    '1992-07-15', 'female', 'English',
    '4521 Nicollet Ave', 'Minneapolis', 'MN', '55419', '612-555-0301',
    'Employment Services', 'DD', 'MA-559001', 'Anoka',
    '2025-11-19', '2025-11-19',
    'James O''Brien', 'Anoka County Social Services', '763-555-0401',
    'self',
    'active'
  ),
  (
    'cccccccc-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Devon Washington', 'Devon',
    '2001-01-08', 'non_binary', 'English',
    '890 Payne Ave', 'Saint Paul', 'MN', '55101', '651-555-0302',
    'ICLS', 'CADI', 'MA-441902', 'Hennepin',
    '2026-02-07', '2026-02-07',
    'Linda Park', 'Hennepin County Health & Human Services', '612-555-0402',
    'full_guardian',
    'active'
  ),
  (
    'cccccccc-0000-0000-0000-000000000003',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Sofia Martinez', 'Sofia',
    '1988-09-23', 'female', 'Spanish',
    '1234 Lake Street E', 'Minneapolis', 'MN', '55407', '612-555-0303',
    'IHS', 'CAC', 'MA-771309', 'Ramsey',
    '2026-05-08', '2026-05-08',
    'Robert Kim', 'Ramsey County Social Services', '651-555-0403',
    'limited_guardian',
    'active'
  ),
  (
    'cccccccc-0000-0000-0000-000000000004',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Marcus Anderson', 'Marcus',
    '1995-04-12', 'male', 'English',
    '567 Maryland Ave E', 'Saint Paul', 'MN', '55106', '651-555-0304',
    'ICS', 'DD', 'MA-882114', 'Hennepin',
    '2026-06-07', '2026-06-07',
    'Jane Doe', 'Hennepin County Health & Human Services', '612-555-0404',
    'self',
    'active'
  ),
  (
    'cccccccc-0000-0000-0000-000000000005',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'James Okafor', 'James',
    '1979-11-30', 'male', 'English',
    '2200 Penn Ave N', 'Minneapolis', 'MN', '55411', '612-555-0305',
    'Day Services', 'BI', 'MA-663421', 'Hennepin',
    '2025-09-01', '2025-09-01',
    'Maria Santos', 'Hennepin County Health & Human Services', '612-555-0405',
    'conservator',
    'active'
  );

-- ============================================================
-- STAFF PROFILES
-- ============================================================

INSERT INTO staff_profiles (
  id, organization_id,
  full_name, email, phone, role, title,
  hire_date, is_active,
  background_study_status, background_study_date, background_study_expires
)
VALUES
  (
    '55555555-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Yusuf Hassan', 'yusuf@northernlights245d.com', '651-555-0501',
    'org_admin', 'Executive Director',
    '2020-01-15', TRUE,
    'clear', '2023-06-01', '2026-06-01'
  ),
  (
    '55555555-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Priya Sharma', 'priya@northernlights245d.com', '651-555-0502',
    'program_manager', 'Program Manager',
    '2021-03-20', TRUE,
    'clear', '2023-06-15', '2026-06-15'
  ),
  (
    '55555555-0000-0000-0000-000000000003',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Carlos Rivera', 'carlos@northernlights245d.com', '651-555-0503',
    'staff', 'Direct Support Professional',
    '2022-08-01', TRUE,
    'clear', '2022-08-10', '2025-08-10'   -- EXPIRED
  ),
  (
    '55555555-0000-0000-0000-000000000004',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Amara Diallo', 'amara@northernlights245d.com', '651-555-0504',
    'staff', 'Direct Support Professional',
    '2023-11-01', TRUE,
    'pending', NULL, NULL
  );

-- ============================================================
-- STAFF TRAININGS
-- ============================================================

INSERT INTO staff_trainings (
  organization_id, staff_id, training_name, training_code,
  completed_date, expiration_date, status
)
VALUES
  -- Yusuf Hassan — all current
  ('aaaaaaaa-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', 'CPR/AED', 'CPR', '2024-06-01', '2026-06-01', 'current'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', 'First Aid', 'FA', '2024-06-01', '2026-06-01', 'current'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', '245D Orientation', '245D-ORI', '2020-01-20', NULL, 'current'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', 'Mandated Reporter', 'MR', '2024-01-15', '2026-01-15', 'current'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', 'Vulnerable Adult', 'VA', '2024-01-15', '2026-01-15', 'current'),

  -- Priya Sharma — CPR expiring soon
  ('aaaaaaaa-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000002', 'CPR/AED', 'CPR', '2024-07-01', '2026-07-01', 'current'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000002', 'First Aid', 'FA', '2024-07-01', '2026-07-01', 'current'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000002', '245D Orientation', '245D-ORI', '2021-03-25', NULL, 'current'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000002', 'Mandated Reporter', 'MR', '2022-03-20', '2024-03-20', 'expired'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000002', 'Vulnerable Adult', 'VA', '2024-03-20', '2026-03-20', 'current'),

  -- Carlos Rivera — background study expired, medication admin missing
  ('aaaaaaaa-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000003', 'CPR/AED', 'CPR', '2023-08-01', '2025-08-01', 'expired'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000003', 'First Aid', 'FA', '2023-08-01', '2025-08-01', 'expired'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000003', '245D Orientation', '245D-ORI', '2022-08-05', NULL, 'current'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000003', 'Mandated Reporter', 'MR', '2023-08-01', '2025-08-01', 'expired'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000003', 'Vulnerable Adult', 'VA', '2023-08-01', '2025-08-01', 'expired'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000003', 'Medication Administration', 'MED-ADMIN', NULL, NULL, 'not_completed'),

  -- Amara Diallo — new hire, several not completed
  ('aaaaaaaa-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000004', 'CPR/AED', 'CPR', '2023-11-10', '2025-11-10', 'expired'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000004', 'First Aid', 'FA', '2023-11-10', '2025-11-10', 'expired'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000004', '245D Orientation', '245D-ORI', '2023-11-15', NULL, 'current'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000004', 'Mandated Reporter', 'MR', NULL, NULL, 'not_completed'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000004', 'Vulnerable Adult', 'VA', NULL, NULL, 'not_completed');

-- ============================================================
-- PACKETS
-- ============================================================

INSERT INTO packets (
  id, organization_id, client_id, packet_type, status,
  due_date, completed_date, review_period_start, review_period_end
)
VALUES
  -- Aisha Patel — Annual Review (NEEDS SIGNATURE)
  (
    '44444444-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'cccccccc-0000-0000-0000-000000000001',
    'annual_review', 'needs_signature',
    '2026-06-12', NULL,
    '2025-11-19', '2026-11-19'
  ),
  -- Devon Washington — Semi-Annual Review (IN PROGRESS)
  (
    '44444444-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'cccccccc-0000-0000-0000-000000000002',
    'semi_annual_review', 'in_progress',
    '2026-06-19', NULL,
    '2026-02-07', '2026-08-07'
  ),
  -- Sofia Martinez — 45-Day Review (OVERDUE)
  (
    '44444444-0000-0000-0000-000000000003',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'cccccccc-0000-0000-0000-000000000003',
    '45_day_review', 'overdue',
    '2026-06-04', NULL,
    '2026-05-08', '2026-06-22'
  ),
  -- Marcus Anderson — Intake Packet (IN PROGRESS)
  (
    '44444444-0000-0000-0000-000000000004',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'cccccccc-0000-0000-0000-000000000004',
    'intake', 'in_progress',
    '2026-06-14', NULL,
    NULL, NULL
  ),
  -- Marcus Anderson — 45-Day Review (NOT STARTED, future)
  (
    '44444444-0000-0000-0000-000000000005',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'cccccccc-0000-0000-0000-000000000004',
    '45_day_review', 'not_started',
    '2026-07-22', NULL,
    '2026-06-07', '2026-07-22'
  ),
  -- James Okafor — Annual Review (COMPLETED)
  (
    '44444444-0000-0000-0000-000000000006',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'cccccccc-0000-0000-0000-000000000005',
    'annual_review', 'completed',
    '2026-03-01', '2026-02-28',
    '2025-09-01', '2026-09-01'
  );

-- ============================================================
-- PACKET FORMS — wire up forms to packets
-- ============================================================

-- Intake packet (Marcus Anderson) — all intake forms
INSERT INTO packet_forms (packet_id, template_id, status, sort_order)
VALUES
  ('44444444-0000-0000-0000-000000000004', '00000000-0000-0000-0001-000000000001', 'in_progress', 1),
  ('44444444-0000-0000-0000-000000000004', '00000000-0000-0000-0001-000000000002', 'not_started', 2),
  ('44444444-0000-0000-0000-000000000004', '00000000-0000-0000-0001-000000000003', 'not_started', 3),
  ('44444444-0000-0000-0000-000000000004', '00000000-0000-0000-0001-000000000004', 'not_started', 4),
  ('44444444-0000-0000-0000-000000000004', '00000000-0000-0000-0001-000000000005', 'not_started', 5),
  ('44444444-0000-0000-0000-000000000004', '00000000-0000-0000-0001-000000000006', 'not_started', 6);

-- 45-Day Review (Sofia Martinez — OVERDUE)
INSERT INTO packet_forms (packet_id, template_id, status, sort_order)
VALUES
  ('44444444-0000-0000-0000-000000000003', '00000000-0000-0000-0001-000000000007', 'not_started', 1),
  ('44444444-0000-0000-0000-000000000003', '00000000-0000-0000-0001-000000000003', 'not_started', 2);

-- Semi-Annual Review (Devon Washington)
INSERT INTO packet_forms (packet_id, template_id, status, sort_order)
VALUES
  ('44444444-0000-0000-0000-000000000002', '00000000-0000-0000-0001-000000000008', 'in_progress', 1),
  ('44444444-0000-0000-0000-000000000002', '00000000-0000-0000-0001-000000000003', 'not_started', 2);

-- Annual Review (Aisha Patel — NEEDS SIGNATURE)
INSERT INTO packet_forms (packet_id, template_id, status, sort_order, submitted_at)
VALUES
  ('44444444-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000009', 'needs_signature', 1, NOW() - INTERVAL '2 days'),
  ('44444444-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000003', 'needs_signature', 2, NOW() - INTERVAL '2 days');

-- ============================================================
-- SAMPLE FORM RESPONSES (partial intake for Marcus Anderson)
-- ============================================================

-- Get the packet_form ID for Marcus's intake form
-- (We'll use the known UUID pattern we inserted above)

WITH marcus_intake_form AS (
  SELECT pf.id
  FROM packet_forms pf
  JOIN packets p ON p.id = pf.packet_id
  WHERE p.id = '44444444-0000-0000-0000-000000000004'
    AND pf.template_id = '00000000-0000-0000-0001-000000000001'
  LIMIT 1
)
INSERT INTO form_responses (packet_form_id, field_key, value)
SELECT
  marcus_intake_form.id,
  field_key,
  value
FROM marcus_intake_form,
(VALUES
  ('legal_name', 'Marcus Anderson'),
  ('preferred_name', 'Marcus'),
  ('date_of_birth', '1995-04-12'),
  ('gender', 'male'),
  ('primary_language', 'English'),
  ('home_address', '567 Maryland Ave E, Saint Paul, MN 55106'),
  ('phone', '651-555-0304'),
  ('emergency_contact_name', 'Sandra Anderson'),
  ('emergency_contact_phone', '651-555-0600'),
  ('emergency_contact_relationship', 'Mother'),
  ('program', 'ICS'),
  ('service_start_date', '2026-06-07'),
  ('medicaid_number', 'MA-882114'),
  ('county_of_service', 'Hennepin'),
  ('case_manager_name', 'Jane Doe'),
  ('case_manager_agency', 'Hennepin County Health & Human Services'),
  ('case_manager_phone', '612-555-0404'),
  ('guardianship_status', 'self')
) AS responses(field_key, value);

-- ============================================================
-- SAMPLE INCIDENT
-- ============================================================

INSERT INTO incidents (
  id, organization_id, client_id,
  category, status,
  occurred_at, location, description, immediate_actions,
  guardian_notified, guardian_notified_at,
  follow_up_required, follow_up_due_date
)
VALUES
  (
    '33333333-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'cccccccc-0000-0000-0000-000000000002',
    'behavioral_incident', 'under_review',
    NOW() - INTERVAL '5 days',
    'Community Day Program Site',
    'Client became agitated during group activity and verbally escalated. Staff attempted de-escalation using preferred strategies. Incident resolved after approximately 15 minutes with client returning to baseline.',
    'Staff used verbal de-escalation techniques. Client was provided quiet space. Supervisor was notified. No physical intervention required. Client''s case manager was called.',
    TRUE, NOW() - INTERVAL '5 days',
    TRUE, CURRENT_DATE + INTERVAL '2 days'
  );

-- ============================================================
-- SAMPLE AUDIT LOG ENTRIES
-- ============================================================

INSERT INTO audit_logs (organization_id, user_email, action, entity_type, entity_id, entity_label, details)
VALUES
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'admin@northernlights245d.com',
    'client_created',
    'client',
    'cccccccc-0000-0000-0000-000000000004',
    'Marcus Anderson',
    '{"note": "Intake started for new service recipient"}'::jsonb
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'admin@northernlights245d.com',
    'packet_created',
    'packet',
    '44444444-0000-0000-0000-000000000004',
    'Marcus Anderson — Intake Packet',
    '{"packet_type": "intake", "client_id": "cccccccc-0000-0000-0000-000000000004"}'::jsonb
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'priya@northernlights245d.com',
    'form_saved',
    'packet_form',
    NULL,
    'Service Recipient Intake & Demographics',
    '{"client": "Marcus Anderson", "form_code": "245D-INTAKE-01"}'::jsonb
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'admin@northernlights245d.com',
    'incident_submitted',
    'incident',
    '33333333-0000-0000-0000-000000000001',
    'INC-2026-0001 — Behavioral Incident',
    '{"client": "Devon Washington", "category": "behavioral_incident"}'::jsonb
  );

-- ============================================================
-- UPDATE STAFF TRAINING STATUSES (computed)
-- ============================================================

UPDATE staff_trainings
SET status = CASE
  WHEN completed_date IS NULL THEN 'not_completed'
  WHEN expiration_date IS NULL THEN 'current'
  WHEN expiration_date < CURRENT_DATE THEN 'expired'
  WHEN expiration_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
  ELSE 'current'
END::staff_training_status;

-- ============================================================
-- STORAGE BUCKET SETUP NOTE
-- ============================================================
-- Create these buckets in your Supabase Storage dashboard:
--
-- 1. Bucket name: "documents"   — Private, RLS enforced
-- 2. Bucket name: "avatars"     — Public (for user profile photos)
-- 3. Bucket name: "signatures"  — Private (signature images)
--
-- Storage RLS policies (run in Supabase dashboard > Storage > Policies):
--
-- For "documents" bucket:
-- SELECT: (auth.role() = 'authenticated') AND
--         (storage.foldername(name)[1] = get_my_org_id()::text)
-- INSERT: same as above
-- DELETE: (auth.role() = 'authenticated') AND has_role('org_admin') AND
--         (storage.foldername(name)[1] = get_my_org_id()::text)
--
-- File path convention: {org_id}/{client_id}/{category}/{filename}
-- Example: aaaaaaaa-.../cccccccc-.../medical/assessment-2026.pdf
-- ============================================================
