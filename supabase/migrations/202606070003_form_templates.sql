-- ============================================================
-- Stillwater 245D Suite — System Form Templates
-- ============================================================
-- Run AFTER 002_rls_policies.sql
-- These are system templates (is_system = TRUE, organization_id = NULL)
-- visible to all organizations.
-- ============================================================

-- ============================================================
-- FORM TEMPLATES
-- ============================================================

INSERT INTO form_templates (id, code, name, description, packet_types, sort_order, is_system)
VALUES
  (
    '00000000-0000-0000-0001-000000000001',
    '245D-INTAKE-01',
    'Service Recipient Intake & Demographics',
    'Initial demographic and personal information for service recipients receiving 245D services.',
    ARRAY['intake']::packet_type[],
    1, TRUE
  ),
  (
    '00000000-0000-0000-0001-000000000002',
    '245D-SA-02',
    '245D Service Agreement',
    'Legal service agreement outlining the scope, terms, and conditions of 245D services.',
    ARRAY['intake']::packet_type[],
    2, TRUE
  ),
  (
    '00000000-0000-0000-0001-000000000003',
    '245D-CSSP-03',
    'Coordinated Service & Support Plan (CSSP) Addendum',
    'Addendum to the CSSP detailing individualized support strategies and goals.',
    ARRAY['intake', '45_day_review', 'semi_annual_review', 'annual_review']::packet_type[],
    3, TRUE
  ),
  (
    '00000000-0000-0000-0001-000000000004',
    '245D-HEALTH-04',
    'Health & Medical Information',
    'Medical history, diagnoses, medications, allergies, and health-related support needs.',
    ARRAY['intake']::packet_type[],
    4, TRUE
  ),
  (
    '00000000-0000-0000-0001-000000000005',
    '245D-EMRG-05',
    'Emergency Contacts & Risk Assessment',
    'Emergency contact information and individual risk assessment documentation.',
    ARRAY['intake', 'annual_review']::packet_type[],
    5, TRUE
  ),
  (
    '00000000-0000-0000-0001-000000000006',
    '245D-RIGHTS-06',
    'Service Recipient Rights & Consent',
    'Notification of rights, consents, and acknowledgements required under 245D.',
    ARRAY['intake', 'annual_review']::packet_type[],
    6, TRUE
  ),
  (
    '00000000-0000-0000-0001-000000000007',
    '245D-REV-45',
    '45-Day Service Review',
    'Review of services, progress, and any needed plan modifications at the 45-day mark.',
    ARRAY['45_day_review']::packet_type[],
    7, TRUE
  ),
  (
    '00000000-0000-0000-0001-000000000008',
    '245D-REV-SEMI',
    'Semi-Annual Service Review',
    'Six-month review of service effectiveness, goals progress, and plan updates.',
    ARRAY['semi_annual_review']::packet_type[],
    8, TRUE
  ),
  (
    '00000000-0000-0000-0001-000000000009',
    '245D-REV-ANN',
    'Annual Service Review',
    'Comprehensive annual review of all services, outcomes, and plan renewal.',
    ARRAY['annual_review']::packet_type[],
    9, TRUE
  );

-- ============================================================
-- FORM FIELDS — 245D-INTAKE-01: Service Recipient Intake & Demographics
-- ============================================================

INSERT INTO form_fields (template_id, section_label, field_key, label, field_type, is_required, sort_order, options, is_hipaa)
VALUES
  -- Personal Information
  ('00000000-0000-0000-0001-000000000001', 'Personal Information', 'legal_name', 'Legal Name', 'text', TRUE, 10, NULL, FALSE),
  ('00000000-0000-0000-0001-000000000001', 'Personal Information', 'preferred_name', 'Preferred Name', 'text', FALSE, 20, NULL, FALSE),
  ('00000000-0000-0000-0001-000000000001', 'Personal Information', 'date_of_birth', 'Date of Birth', 'date', TRUE, 30, NULL, TRUE),
  ('00000000-0000-0000-0001-000000000001', 'Personal Information', 'gender', 'Gender', 'select', TRUE, 40,
    '[{"label":"Male","value":"male"},{"label":"Female","value":"female"},{"label":"Non-binary","value":"non_binary"},{"label":"Prefer not to say","value":"prefer_not"}]'::jsonb, FALSE),
  ('00000000-0000-0000-0001-000000000001', 'Personal Information', 'ssn_last4', 'SSN (last 4 digits)', 'text', FALSE, 50, NULL, TRUE),
  ('00000000-0000-0000-0001-000000000001', 'Personal Information', 'primary_language', 'Primary Language', 'text', FALSE, 60, NULL, FALSE),
  -- Contact & Address
  ('00000000-0000-0000-0001-000000000001', 'Contact & Address', 'home_address', 'Home Address', 'textarea', TRUE, 70, NULL, FALSE),
  ('00000000-0000-0000-0001-000000000001', 'Contact & Address', 'phone', 'Phone Number', 'phone', FALSE, 80, NULL, FALSE),
  ('00000000-0000-0000-0001-000000000001', 'Contact & Address', 'email', 'Email Address', 'email', FALSE, 90, NULL, FALSE),
  ('00000000-0000-0000-0001-000000000001', 'Contact & Address', 'emergency_contact_name', 'Emergency Contact Name', 'text', TRUE, 100, NULL, FALSE),
  ('00000000-0000-0000-0001-000000000001', 'Contact & Address', 'emergency_contact_phone', 'Emergency Contact Phone', 'phone', TRUE, 110, NULL, FALSE),
  ('00000000-0000-0000-0001-000000000001', 'Contact & Address', 'emergency_contact_relationship', 'Relationship', 'text', FALSE, 120, NULL, FALSE),
  -- Program Enrollment
  ('00000000-0000-0000-0001-000000000001', 'Program Enrollment', 'program', 'Primary 245D Program', 'select', TRUE, 130,
    '[{"label":"ICS – Individualized Community Supports","value":"ICS"},{"label":"ICLS – Individualized Home Supports with Family Training","value":"ICLS"},{"label":"IHS – In-Home Supports","value":"IHS"},{"label":"Employment Services","value":"Employment Services"},{"label":"Day Services","value":"Day Services"},{"label":"Residential","value":"Residential"},{"label":"Other","value":"Other"}]'::jsonb, FALSE),
  ('00000000-0000-0000-0001-000000000001', 'Program Enrollment', 'service_start_date', 'Service Start Date', 'date', TRUE, 140, NULL, FALSE),
  ('00000000-0000-0000-0001-000000000001', 'Program Enrollment', 'medicaid_number', 'Medicaid / MA Number', 'text', TRUE, 150, NULL, TRUE),
  ('00000000-0000-0000-0001-000000000001', 'Program Enrollment', 'waiver_type', 'Waiver Type', 'select', FALSE, 160,
    '[{"label":"CAC","value":"CAC"},{"label":"CADI","value":"CADI"},{"label":"DD","value":"DD"},{"label":"BI","value":"BI"},{"label":"EW","value":"EW"},{"label":"AC","value":"AC"},{"label":"Other","value":"Other"}]'::jsonb, FALSE),
  ('00000000-0000-0000-0001-000000000001', 'Program Enrollment', 'county_of_service', 'County of Service', 'text', FALSE, 170, NULL, FALSE),
  -- Case Management & Guardian
  ('00000000-0000-0000-0001-000000000001', 'Case Management & Guardian', 'case_manager_name', 'Case Manager Name', 'text', TRUE, 180, NULL, FALSE),
  ('00000000-0000-0000-0001-000000000001', 'Case Management & Guardian', 'case_manager_agency', 'Case Manager Agency', 'text', FALSE, 190, NULL, FALSE),
  ('00000000-0000-0000-0001-000000000001', 'Case Management & Guardian', 'case_manager_phone', 'Case Manager Phone', 'phone', FALSE, 200, NULL, FALSE),
  ('00000000-0000-0000-0001-000000000001', 'Case Management & Guardian', 'case_manager_email', 'Case Manager Email', 'email', FALSE, 210, NULL, FALSE),
  ('00000000-0000-0000-0001-000000000001', 'Case Management & Guardian', 'guardianship_status', 'Guardianship Status', 'radio', TRUE, 220,
    '[{"label":"Self (No guardian)","value":"self"},{"label":"Full Guardian","value":"full_guardian"},{"label":"Limited Guardian","value":"limited_guardian"},{"label":"Conservator","value":"conservator"},{"label":"Health Care Agent","value":"health_care_agent"},{"label":"Other","value":"other"}]'::jsonb, FALSE),
  ('00000000-0000-0000-0001-000000000001', 'Case Management & Guardian', 'guardian_name', 'Guardian / Conservator Name', 'text', FALSE, 230, NULL, FALSE),
  ('00000000-0000-0000-0001-000000000001', 'Case Management & Guardian', 'guardian_phone', 'Guardian Phone', 'phone', FALSE, 240, NULL, FALSE),
  -- Signatures
  ('00000000-0000-0000-0001-000000000001', 'Signatures', 'sig_client', 'Service Recipient Signature', 'signature', TRUE, 250, NULL, FALSE),
  ('00000000-0000-0000-0001-000000000001', 'Signatures', 'sig_guardian', 'Guardian / Conservator Signature (if applicable)', 'signature', FALSE, 260, NULL, FALSE),
  ('00000000-0000-0000-0001-000000000001', 'Signatures', 'sig_staff', 'Staff Signature', 'signature', TRUE, 270, NULL, FALSE);

-- ============================================================
-- FORM FIELDS — 245D-SA-02: Service Agreement
-- ============================================================

INSERT INTO form_fields (template_id, section_label, field_key, label, field_type, is_required, sort_order, options)
VALUES
  ('00000000-0000-0000-0001-000000000002', 'Service Details', 'services_authorized', 'Authorized Services', 'textarea', TRUE, 10, NULL),
  ('00000000-0000-0000-0001-000000000002', 'Service Details', 'service_frequency', 'Service Frequency', 'text', TRUE, 20, NULL),
  ('00000000-0000-0000-0001-000000000002', 'Service Details', 'authorized_hours_weekly', 'Authorized Hours Per Week', 'number', FALSE, 30, NULL),
  ('00000000-0000-0000-0001-000000000002', 'Service Details', 'agreement_start_date', 'Agreement Start Date', 'date', TRUE, 40, NULL),
  ('00000000-0000-0000-0001-000000000002', 'Service Details', 'agreement_end_date', 'Agreement End Date', 'date', TRUE, 50, NULL),
  ('00000000-0000-0000-0001-000000000002', 'Service Details', 'service_location', 'Primary Service Location', 'text', FALSE, 60, NULL),
  ('00000000-0000-0000-0001-000000000002', 'Rates & Billing', 'hourly_rate', 'Hourly Rate', 'text', FALSE, 70, NULL),
  ('00000000-0000-0000-0001-000000000002', 'Rates & Billing', 'billing_authority', 'Billing Authority', 'text', FALSE, 80, NULL),
  ('00000000-0000-0000-0001-000000000002', 'Rights & Responsibilities', 'recipient_rights_reviewed', 'Service Recipient Rights Reviewed', 'checkbox', TRUE, 90,
    '[{"label":"I confirm that service recipient rights have been reviewed with the client","value":"confirmed"}]'),
  ('00000000-0000-0000-0001-000000000002', 'Rights & Responsibilities', 'complaint_process_reviewed', 'Complaint/Grievance Process Reviewed', 'checkbox', TRUE, 100,
    '[{"label":"The complaint and grievance process has been explained","value":"confirmed"}]'),
  ('00000000-0000-0000-0001-000000000002', 'Rights & Responsibilities', 'termination_notice_days', 'Notice of Termination (days)', 'select', TRUE, 110,
    '[{"label":"14 days","value":"14"},{"label":"30 days","value":"30"},{"label":"60 days","value":"60"}]'),
  ('00000000-0000-0000-0001-000000000002', 'Signatures', 'sig_client', 'Service Recipient Signature', 'signature', TRUE, 120, NULL),
  ('00000000-0000-0000-0001-000000000002', 'Signatures', 'sig_guardian', 'Guardian Signature (if applicable)', 'signature', FALSE, 130, NULL),
  ('00000000-0000-0000-0001-000000000002', 'Signatures', 'sig_agency_rep', 'Agency Representative Signature', 'signature', TRUE, 140, NULL),
  ('00000000-0000-0000-0001-000000000002', 'Signatures', 'sig_case_manager', 'Case Manager Signature', 'signature', FALSE, 150, NULL);

-- ============================================================
-- FORM FIELDS — 245D-HEALTH-04: Health & Medical
-- ============================================================

INSERT INTO form_fields (template_id, section_label, field_key, label, field_type, is_required, sort_order, options, is_hipaa)
VALUES
  ('00000000-0000-0000-0001-000000000004', 'Diagnoses', 'primary_diagnosis', 'Primary Diagnosis', 'text', TRUE, 10, NULL, TRUE),
  ('00000000-0000-0000-0001-000000000004', 'Diagnoses', 'secondary_diagnoses', 'Secondary Diagnoses', 'textarea', FALSE, 20, NULL, TRUE),
  ('00000000-0000-0000-0001-000000000004', 'Diagnoses', 'disability_type', 'Disability Type', 'select', FALSE, 30,
    '[{"label":"Intellectual Disability","value":"intellectual"},{"label":"Developmental Disability","value":"developmental"},{"label":"Physical Disability","value":"physical"},{"label":"Traumatic Brain Injury","value":"tbi"},{"label":"Mental Illness","value":"mental_illness"},{"label":"Multiple","value":"multiple"},{"label":"Other","value":"other"}]'::jsonb, FALSE),
  ('00000000-0000-0000-0001-000000000004', 'Medications', 'current_medications', 'Current Medications', 'textarea', FALSE, 40, NULL, TRUE),
  ('00000000-0000-0000-0001-000000000004', 'Medications', 'medication_administration', 'Medication Administration Needs', 'radio', TRUE, 50,
    '[{"label":"Self-administers independently","value":"independent"},{"label":"Requires reminders only","value":"reminders"},{"label":"Requires staff assistance","value":"assistance"},{"label":"Staff administers all medications","value":"full_admin"}]'::jsonb, FALSE),
  ('00000000-0000-0000-0001-000000000004', 'Medications', 'pharmacy_name', 'Pharmacy Name', 'text', FALSE, 60, NULL, FALSE),
  ('00000000-0000-0000-0001-000000000004', 'Allergies', 'known_allergies', 'Known Allergies', 'textarea', TRUE, 70, NULL, TRUE),
  ('00000000-0000-0000-0001-000000000004', 'Allergies', 'allergy_action_plan', 'Allergy Action Plan', 'textarea', FALSE, 80, NULL, FALSE),
  ('00000000-0000-0000-0001-000000000004', 'Medical Providers', 'primary_physician', 'Primary Physician Name', 'text', FALSE, 90, NULL, FALSE),
  ('00000000-0000-0000-0001-000000000004', 'Medical Providers', 'physician_phone', 'Physician Phone', 'phone', FALSE, 100, NULL, FALSE),
  ('00000000-0000-0000-0001-000000000004', 'Medical Providers', 'physician_clinic', 'Clinic / Hospital', 'text', FALSE, 110, NULL, FALSE),
  ('00000000-0000-0000-0001-000000000004', 'Medical Providers', 'insurance_carrier', 'Health Insurance Carrier', 'text', FALSE, 120, NULL, FALSE),
  ('00000000-0000-0000-0001-000000000004', 'Medical Providers', 'insurance_id', 'Insurance ID Number', 'text', FALSE, 130, NULL, TRUE),
  ('00000000-0000-0000-0001-000000000004', 'Special Health Needs', 'dietary_restrictions', 'Dietary Restrictions / Special Diet', 'textarea', FALSE, 140, NULL, FALSE),
  ('00000000-0000-0000-0001-000000000004', 'Special Health Needs', 'mobility_needs', 'Mobility / Physical Support Needs', 'textarea', FALSE, 150, NULL, FALSE),
  ('00000000-0000-0000-0001-000000000004', 'Special Health Needs', 'communication_needs', 'Communication Support Needs', 'textarea', FALSE, 160, NULL, FALSE),
  ('00000000-0000-0000-0001-000000000004', 'Signatures', 'sig_client', 'Service Recipient Signature', 'signature', TRUE, 170, NULL, FALSE),
  ('00000000-0000-0000-0001-000000000004', 'Signatures', 'sig_guardian', 'Guardian Signature (if applicable)', 'signature', FALSE, 180, NULL, FALSE),
  ('00000000-0000-0000-0001-000000000004', 'Signatures', 'sig_staff', 'Staff Signature', 'signature', TRUE, 190, NULL, FALSE);

-- ============================================================
-- FORM FIELDS — 245D-REV-45: 45-Day Review
-- ============================================================

INSERT INTO form_fields (template_id, section_label, field_key, label, field_type, is_required, sort_order, options)
VALUES
  ('00000000-0000-0000-0001-000000000007', 'Review Period', 'review_date', 'Review Date', 'date', TRUE, 10, NULL),
  ('00000000-0000-0000-0001-000000000007', 'Review Period', 'review_period_start', 'Service Start Date', 'date', TRUE, 20, NULL),
  ('00000000-0000-0000-0001-000000000007', 'Services Review', 'services_provided', 'Services Provided During Period', 'textarea', TRUE, 30, NULL),
  ('00000000-0000-0000-0001-000000000007', 'Services Review', 'services_meeting_needs', 'Are services meeting the recipient''s needs?', 'radio', TRUE, 40,
    '[{"label":"Yes, services are meeting needs","value":"yes"},{"label":"Partially meeting needs","value":"partial"},{"label":"No, changes needed","value":"no"}]'),
  ('00000000-0000-0000-0001-000000000007', 'Services Review', 'service_changes_needed', 'Describe any changes needed', 'textarea', FALSE, 50, NULL),
  ('00000000-0000-0000-0001-000000000007', 'Goals Progress', 'goals_progress', 'Progress Toward Goals', 'textarea', TRUE, 60, NULL),
  ('00000000-0000-0000-0001-000000000007', 'Goals Progress', 'barriers_identified', 'Barriers or Challenges Identified', 'textarea', FALSE, 70, NULL),
  ('00000000-0000-0000-0001-000000000007', 'Goals Progress', 'recommendations', 'Recommendations for Next Period', 'textarea', FALSE, 80, NULL),
  ('00000000-0000-0000-0001-000000000007', 'Plan Changes', 'cssp_update_needed', 'CSSP Update Needed?', 'radio', TRUE, 90,
    '[{"label":"Yes","value":"yes"},{"label":"No","value":"no"}]'),
  ('00000000-0000-0000-0001-000000000007', 'Plan Changes', 'cssp_update_notes', 'CSSP Update Notes', 'textarea', FALSE, 100, NULL),
  ('00000000-0000-0000-0001-000000000007', 'Recipient Input', 'recipient_input', 'Service Recipient Input / Feedback', 'textarea', FALSE, 110, NULL),
  ('00000000-0000-0000-0001-000000000007', 'Signatures', 'sig_client', 'Service Recipient Signature', 'signature', TRUE, 120, NULL),
  ('00000000-0000-0000-0001-000000000007', 'Signatures', 'sig_guardian', 'Guardian Signature (if applicable)', 'signature', FALSE, 130, NULL),
  ('00000000-0000-0000-0001-000000000007', 'Signatures', 'sig_staff', 'Staff Signature', 'signature', TRUE, 140, NULL),
  ('00000000-0000-0000-0001-000000000007', 'Signatures', 'sig_case_manager', 'Case Manager Signature', 'signature', FALSE, 150, NULL);

-- ============================================================
-- FORM FIELDS — 245D-RIGHTS-06: Rights & Consent
-- ============================================================

INSERT INTO form_fields (template_id, section_label, field_key, label, field_type, is_required, sort_order, options)
VALUES
  ('00000000-0000-0000-0001-000000000006', 'Rights Review', 'rights_reviewed_date', 'Date Rights Were Reviewed', 'date', TRUE, 10, NULL),
  ('00000000-0000-0000-0001-000000000006', 'Rights Review', 'rights_explained', 'Service recipient rights have been explained', 'checkbox', TRUE, 20,
    '[{"label":"I confirm rights were explained in the recipient''s preferred language","value":"confirmed"}]'),
  ('00000000-0000-0000-0001-000000000006', 'Rights Review', 'rights_include', 'Rights covered include (check all that apply)', 'checkbox', TRUE, 30,
    '[{"label":"Right to respectful treatment","value":"respectful"},{"label":"Right to privacy and confidentiality","value":"privacy"},{"label":"Right to participate in service planning","value":"planning"},{"label":"Right to refuse services","value":"refuse"},{"label":"Right to file a complaint","value":"complaint"},{"label":"Right to freedom from maltreatment","value":"maltreatment"},{"label":"Right to access records","value":"records"}]'),
  ('00000000-0000-0000-0001-000000000006', 'Consents', 'consent_services', 'Consent to Receive Services', 'checkbox', TRUE, 40,
    '[{"label":"I consent to receive the described 245D services","value":"consented"}]'),
  ('00000000-0000-0000-0001-000000000006', 'Consents', 'consent_records', 'Consent to Maintain Records', 'checkbox', TRUE, 50,
    '[{"label":"I consent to the agency maintaining service records","value":"consented"}]'),
  ('00000000-0000-0000-0001-000000000006', 'Consents', 'consent_share_info', 'Consent to Share Information', 'checkbox', FALSE, 60,
    '[{"label":"I consent to sharing information with case manager","value":"case_manager"},{"label":"I consent to sharing information with county","value":"county"},{"label":"I consent to sharing information with other providers","value":"providers"}]'),
  ('00000000-0000-0000-0001-000000000006', 'Consents', 'photo_consent', 'Photo / Video Consent', 'radio', TRUE, 70,
    '[{"label":"Yes, consent given for photos/videos for program use","value":"yes"},{"label":"No, consent not given","value":"no"}]'),
  ('00000000-0000-0000-0001-000000000006', 'Complaint Process', 'complaint_process_explained', 'Complaint process has been explained', 'checkbox', TRUE, 80,
    '[{"label":"I confirm the complaint and grievance process was explained","value":"confirmed"}]'),
  ('00000000-0000-0000-0001-000000000006', 'Complaint Process', 'complaint_contact', 'DHS Licensing Complaint Line: 651-431-6500', 'section_header', FALSE, 90, NULL),
  ('00000000-0000-0000-0001-000000000006', 'Signatures', 'sig_client', 'Service Recipient Signature', 'signature', TRUE, 100, NULL),
  ('00000000-0000-0000-0001-000000000006', 'Signatures', 'sig_guardian', 'Guardian Signature (if applicable)', 'signature', FALSE, 110, NULL),
  ('00000000-0000-0000-0001-000000000006', 'Signatures', 'sig_witness', 'Witness Signature', 'signature', TRUE, 120, NULL);
