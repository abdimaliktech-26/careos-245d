-- ============================================================
-- Stillwater 245D Suite — Initial Schema Migration
-- ============================================================
-- Run this in your Supabase SQL Editor or via the CLI:
--   supabase db push
-- ============================================================

-- Drop all existing schema objects (legacy + prior partial runs) for a clean slate.
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.incidents CASCADE;
DROP TABLE IF EXISTS public.staff_trainings CASCADE;
DROP TABLE IF EXISTS public.staff_profiles CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.signing_links CASCADE;
DROP TABLE IF EXISTS public.signatures CASCADE;
DROP TABLE IF EXISTS public.form_responses CASCADE;
DROP TABLE IF EXISTS public.packet_forms CASCADE;
DROP TABLE IF EXISTS public.packets CASCADE;
DROP TABLE IF EXISTS public.form_fields CASCADE;
DROP TABLE IF EXISTS public.form_templates CASCADE;
DROP TABLE IF EXISTS public.client_contacts CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.invites CASCADE;
DROP TABLE IF EXISTS public.organization_members CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.form_submissions CASCADE;
DROP TABLE IF EXISTS public.form_assignments CASCADE;
DROP TABLE IF EXISTS public.form_definitions CASCADE;
DROP TABLE IF EXISTS public.programs CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP VIEW IF EXISTS public.tenants CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;

DROP FUNCTION IF EXISTS public.current_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.current_tenant_id() CASCADE;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

DROP TYPE IF EXISTS document_category CASCADE;
DROP TYPE IF EXISTS audit_action CASCADE;
DROP TYPE IF EXISTS incident_category CASCADE;
DROP TYPE IF EXISTS incident_status CASCADE;
DROP TYPE IF EXISTS background_study_status CASCADE;
DROP TYPE IF EXISTS staff_training_status CASCADE;
DROP TYPE IF EXISTS form_field_type CASCADE;
DROP TYPE IF EXISTS signature_role CASCADE;
DROP TYPE IF EXISTS guardianship_status CASCADE;
DROP TYPE IF EXISTS waiver_type CASCADE;
DROP TYPE IF EXISTS program_type CASCADE;
DROP TYPE IF EXISTS client_status CASCADE;
DROP TYPE IF EXISTS packet_status CASCADE;
DROP TYPE IF EXISTS packet_type CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

CREATE TYPE user_role AS ENUM (
  'super_admin',
  'org_admin',
  'program_manager',
  'staff',
  'external_signer'
);

CREATE TYPE packet_type AS ENUM (
  'intake',
  '45_day_review',
  'semi_annual_review',
  'annual_review'
);

CREATE TYPE packet_status AS ENUM (
  'not_started',
  'in_progress',
  'needs_signature',
  'completed',
  'overdue'
);

CREATE TYPE client_status AS ENUM (
  'active',
  'inactive',
  'discharged',
  'on_hold'
);

CREATE TYPE program_type AS ENUM (
  'ICS',
  'ICLS',
  'IHS',
  'Employment Services',
  'Day Services',
  'Residential',
  'Other'
);

CREATE TYPE waiver_type AS ENUM (
  'CAC',
  'CADI',
  'DD',
  'BI',
  'EW',
  'AC',
  'Other'
);

CREATE TYPE guardianship_status AS ENUM (
  'self',
  'full_guardian',
  'limited_guardian',
  'conservator',
  'health_care_agent',
  'other'
);

CREATE TYPE signature_role AS ENUM (
  'client',
  'guardian',
  'staff',
  'case_manager',
  'witness',
  'supervisor'
);

CREATE TYPE form_field_type AS ENUM (
  'text',
  'textarea',
  'select',
  'radio',
  'checkbox',
  'date',
  'file',
  'signature',
  'number',
  'phone',
  'email',
  'section_header'
);

CREATE TYPE staff_training_status AS ENUM (
  'current',
  'expiring_soon',
  'expired',
  'not_completed'
);

CREATE TYPE background_study_status AS ENUM (
  'clear',
  'pending',
  'disqualified',
  'not_submitted'
);

CREATE TYPE incident_status AS ENUM (
  'open',
  'under_review',
  'closed',
  'reported_to_state'
);

CREATE TYPE incident_category AS ENUM (
  'injury',
  'medication_error',
  'behavioral_incident',
  'emergency_manual_restraint',
  'maltreatment_concern',
  'death',
  'property_damage',
  'elopement',
  'other'
);

CREATE TYPE audit_action AS ENUM (
  'login',
  'logout',
  'client_created',
  'client_updated',
  'client_viewed',
  'packet_created',
  'packet_updated',
  'form_saved',
  'form_submitted',
  'signature_completed',
  'pdf_downloaded',
  'file_uploaded',
  'file_viewed',
  'file_deleted',
  'staff_record_created',
  'staff_record_updated',
  'incident_submitted',
  'incident_updated',
  'invite_sent',
  'member_role_changed'
);

CREATE TYPE document_category AS ENUM (
  'cssp',
  'cssp_addendum',
  'assessment',
  'service_agreement',
  'medical',
  'guardian',
  'county',
  'background_study',
  'training_certificate',
  'incident_attachment',
  'other'
);

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  license_number TEXT,
  address       TEXT,
  city          TEXT,
  state         TEXT DEFAULT 'MN',
  zip           TEXT,
  phone         TEXT,
  email         TEXT,
  website       TEXT,
  logo_url      TEXT,
  -- Subscription / billing
  plan          TEXT DEFAULT 'trial',         -- trial | starter | pro | enterprise
  plan_expires_at TIMESTAMPTZ,
  -- Metadata
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ORGANIZATION MEMBERS
-- ============================================================

CREATE TABLE IF NOT EXISTS organization_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            user_role NOT NULL DEFAULT 'staff',
  full_name       TEXT,
  email           TEXT,
  avatar_url      TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- ============================================================
-- INVITES
-- ============================================================

CREATE TABLE IF NOT EXISTS invites (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by      UUID REFERENCES auth.users(id),
  email           TEXT NOT NULL,
  role            user_role NOT NULL DEFAULT 'staff',
  token           TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  accepted_at     TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CLIENTS (Service Recipients)
-- ============================================================

CREATE TABLE IF NOT EXISTS clients (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Identity
  legal_name            TEXT NOT NULL,
  preferred_name        TEXT,
  date_of_birth         DATE NOT NULL,
  gender                TEXT,
  ssn_last4             TEXT,               -- Only last 4 digits
  primary_language      TEXT DEFAULT 'English',
  photo_url             TEXT,

  -- Contact
  home_address          TEXT,
  city                  TEXT,
  state                 TEXT DEFAULT 'MN',
  zip                   TEXT,
  phone                 TEXT,
  email                 TEXT,

  -- Program enrollment
  program               program_type NOT NULL,
  waiver_type           waiver_type,
  medicaid_number       TEXT,               -- MA Number
  county_of_service     TEXT,
  service_start_date    DATE,
  intake_date           DATE DEFAULT CURRENT_DATE,

  -- Case management
  case_manager_name     TEXT,
  case_manager_agency   TEXT,
  case_manager_phone    TEXT,
  case_manager_email    TEXT,

  -- Guardian / conservator
  guardianship_status   guardianship_status DEFAULT 'self',
  guardian_name         TEXT,
  guardian_phone        TEXT,
  guardian_email        TEXT,
  guardian_relationship TEXT,

  -- Assignment
  assigned_staff_id     UUID REFERENCES auth.users(id),

  -- Status
  status                client_status DEFAULT 'active',
  discharge_date        DATE,
  discharge_reason      TEXT,

  -- Notes
  notes                 TEXT,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CLIENT CONTACTS (Emergency contacts, additional guardians, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS client_contacts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contact_type    TEXT NOT NULL,            -- 'emergency', 'guardian', 'family', 'medical', 'other'
  name            TEXT NOT NULL,
  relationship    TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  is_primary      BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FORM TEMPLATES
-- ============================================================

CREATE TABLE IF NOT EXISTS form_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL = system template
  code            TEXT NOT NULL UNIQUE,   -- e.g. '245D-INTAKE-01'
  name            TEXT NOT NULL,
  description     TEXT,
  packet_types    packet_type[],          -- which packet types use this form
  sort_order      INTEGER DEFAULT 0,
  version         INTEGER DEFAULT 1,
  is_active       BOOLEAN DEFAULT TRUE,
  is_system       BOOLEAN DEFAULT TRUE,   -- system templates can't be deleted
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FORM FIELDS (template field definitions)
-- ============================================================

CREATE TABLE IF NOT EXISTS form_fields (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id     UUID NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
  section_label   TEXT,                   -- e.g. 'Personal Information'
  field_key       TEXT NOT NULL,          -- machine-readable key
  label           TEXT NOT NULL,          -- display label
  field_type      form_field_type NOT NULL,
  placeholder     TEXT,
  help_text       TEXT,
  options         JSONB,                  -- for select/radio/checkbox: [{label, value}]
  is_required     BOOLEAN DEFAULT FALSE,
  is_hipaa        BOOLEAN DEFAULT FALSE,  -- flag sensitive fields
  conditional_on  TEXT,                   -- field_key that controls visibility
  conditional_value TEXT,                 -- value that shows this field
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PACKETS
-- ============================================================

CREATE TABLE IF NOT EXISTS packets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  packet_type     packet_type NOT NULL,
  status          packet_status DEFAULT 'not_started',

  -- Scheduling
  due_date        DATE NOT NULL,
  completed_date  DATE,

  -- Who manages this packet
  assigned_to     UUID REFERENCES auth.users(id),

  -- Review period (for periodic reviews)
  review_period_start DATE,
  review_period_end   DATE,

  -- Computed compliance score (0-100)
  compliance_score INTEGER,

  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PACKET FORMS (instances of templates within a packet)
-- ============================================================

CREATE TABLE IF NOT EXISTS packet_forms (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  packet_id       UUID NOT NULL REFERENCES packets(id) ON DELETE CASCADE,
  template_id     UUID NOT NULL REFERENCES form_templates(id),

  status          packet_status DEFAULT 'not_started',
  sort_order      INTEGER DEFAULT 0,

  -- Who last edited
  last_edited_by  UUID REFERENCES auth.users(id),
  last_edited_at  TIMESTAMPTZ,

  -- When submitted (locked)
  submitted_at    TIMESTAMPTZ,
  submitted_by    UUID REFERENCES auth.users(id),

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FORM RESPONSES (field-level answers)
-- ============================================================

CREATE TABLE IF NOT EXISTS form_responses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  packet_form_id  UUID NOT NULL REFERENCES packet_forms(id) ON DELETE CASCADE,
  field_key       TEXT NOT NULL,
  value           TEXT,                   -- string representation of value
  value_json      JSONB,                  -- for complex types (checkbox arrays, etc.)
  updated_by      UUID REFERENCES auth.users(id),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(packet_form_id, field_key)
);

-- ============================================================
-- SIGNATURES
-- ============================================================

CREATE TABLE IF NOT EXISTS signatures (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  packet_id         UUID NOT NULL REFERENCES packets(id) ON DELETE CASCADE,
  packet_form_id    UUID REFERENCES packet_forms(id) ON DELETE CASCADE,

  signer_role       signature_role NOT NULL,
  signer_name       TEXT NOT NULL,
  signer_email      TEXT,

  -- For authenticated users
  user_id           UUID REFERENCES auth.users(id),

  -- For external signers (client/guardian)
  external_signer_id UUID,               -- references signing_links.id

  -- Signature data
  signature_data    TEXT,               -- base64 SVG/PNG of drawn signature
  signature_typed   TEXT,               -- typed name as legal signature

  -- Audit fields
  signed_at         TIMESTAMPTZ DEFAULT NOW(),
  ip_address        INET,
  user_agent        TEXT,

  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SIGNING LINKS (secure external signer access)
-- ============================================================

CREATE TABLE IF NOT EXISTS signing_links (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  packet_id       UUID NOT NULL REFERENCES packets(id) ON DELETE CASCADE,
  packet_form_id  UUID REFERENCES packet_forms(id),

  signer_name     TEXT NOT NULL,
  signer_email    TEXT,
  signer_role     signature_role NOT NULL,

  token           TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(48), 'hex'),
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  accessed_at     TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  is_revoked      BOOLEAN DEFAULT FALSE,

  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOCUMENTS (file vault)
-- ============================================================

CREATE TABLE IF NOT EXISTS documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  staff_id        UUID,                   -- references staff_profiles.id
  incident_id     UUID,                   -- references incidents.id
  packet_id       UUID REFERENCES packets(id) ON DELETE SET NULL,

  category        document_category NOT NULL,
  display_name    TEXT NOT NULL,
  description     TEXT,

  -- Supabase Storage
  storage_bucket  TEXT NOT NULL DEFAULT 'documents',
  storage_path    TEXT NOT NULL,          -- path within bucket
  file_size       BIGINT,                 -- bytes
  mime_type       TEXT,

  uploaded_by     UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STAFF PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS staff_profiles (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id               UUID REFERENCES auth.users(id),

  full_name             TEXT NOT NULL,
  email                 TEXT NOT NULL,
  phone                 TEXT,
  role                  user_role DEFAULT 'staff',
  title                 TEXT,

  hire_date             DATE,
  termination_date      DATE,
  is_active             BOOLEAN DEFAULT TRUE,

  -- Background study
  background_study_status background_study_status DEFAULT 'not_submitted',
  background_study_date   DATE,
  background_study_number TEXT,
  background_study_expires DATE,

  -- Notes
  notes                 TEXT,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Forward-declare FK for documents.staff_id
ALTER TABLE documents
  ADD CONSTRAINT documents_staff_id_fkey
  FOREIGN KEY (staff_id) REFERENCES staff_profiles(id) ON DELETE SET NULL;

-- ============================================================
-- STAFF TRAININGS
-- ============================================================

CREATE TABLE IF NOT EXISTS staff_trainings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id        UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,

  training_name   TEXT NOT NULL,          -- e.g. 'CPR', '245D Orientation'
  training_code   TEXT,                   -- internal code
  completed_date  DATE,
  expiration_date DATE,
  status          staff_training_status DEFAULT 'not_completed',

  -- Proof document
  document_id     UUID REFERENCES documents(id) ON DELETE SET NULL,
  certificate_url TEXT,

  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INCIDENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS incidents (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id             UUID REFERENCES clients(id) ON DELETE SET NULL,

  incident_number       TEXT,             -- auto-generated reference number
  category              incident_category NOT NULL,
  status                incident_status DEFAULT 'open',

  occurred_at           TIMESTAMPTZ NOT NULL,
  location              TEXT,
  description           TEXT NOT NULL,
  immediate_actions     TEXT,

  -- Staff involved
  reported_by           UUID REFERENCES auth.users(id),
  staff_involved        UUID[],           -- array of user_ids

  -- Notifications
  guardian_notified     BOOLEAN DEFAULT FALSE,
  guardian_notified_at  TIMESTAMPTZ,
  case_manager_notified BOOLEAN DEFAULT FALSE,
  case_manager_notified_at TIMESTAMPTZ,
  dhs_reported          BOOLEAN DEFAULT FALSE,
  dhs_reported_at       TIMESTAMPTZ,
  dhs_report_number     TEXT,

  -- Follow-up
  follow_up_required    BOOLEAN DEFAULT FALSE,
  follow_up_notes       TEXT,
  follow_up_due_date    DATE,
  resolved_at           TIMESTAMPTZ,
  resolved_by           UUID REFERENCES auth.users(id),

  -- AI analysis placeholder (for future)
  ai_analysis           JSONB,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Forward-declare FK for documents.incident_id
ALTER TABLE documents
  ADD CONSTRAINT documents_incident_id_fkey
  FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE SET NULL;

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email      TEXT,                   -- denormalized for permanent record

  action          audit_action NOT NULL,
  entity_type     TEXT,                   -- 'client', 'packet', 'form', etc.
  entity_id       UUID,
  entity_label    TEXT,                   -- human-readable identifier

  details         JSONB,                  -- extra context
  ip_address      INET,
  user_agent      TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs are append-only — no updates or deletes allowed
-- (enforced via RLS below)

-- ============================================================
-- INDEXES
-- ============================================================

-- Organizations
CREATE INDEX idx_org_members_org    ON organization_members(organization_id);
CREATE INDEX idx_org_members_user   ON organization_members(user_id);
CREATE INDEX idx_invites_org        ON invites(organization_id);
CREATE INDEX idx_invites_token      ON invites(token);

-- Clients
CREATE INDEX idx_clients_org        ON clients(organization_id);
CREATE INDEX idx_clients_status     ON clients(organization_id, status);
CREATE INDEX idx_clients_program    ON clients(organization_id, program);
CREATE INDEX idx_client_contacts    ON client_contacts(client_id);

-- Packets
CREATE INDEX idx_packets_org        ON packets(organization_id);
CREATE INDEX idx_packets_client     ON packets(client_id);
CREATE INDEX idx_packets_status     ON packets(organization_id, status);
CREATE INDEX idx_packets_due        ON packets(organization_id, due_date);
CREATE INDEX idx_packets_type       ON packets(organization_id, packet_type);

-- Forms
CREATE INDEX idx_form_templates_org  ON form_templates(organization_id);
CREATE INDEX idx_form_fields_tpl     ON form_fields(template_id);
CREATE INDEX idx_packet_forms_pkt    ON packet_forms(packet_id);
CREATE INDEX idx_form_responses_pf   ON form_responses(packet_form_id);

-- Signatures
CREATE INDEX idx_signatures_packet   ON signatures(packet_id);
CREATE INDEX idx_signing_links_token ON signing_links(token);
CREATE INDEX idx_signing_links_pkt   ON signing_links(packet_id);

-- Documents
CREATE INDEX idx_documents_org       ON documents(organization_id);
CREATE INDEX idx_documents_client    ON documents(client_id);
CREATE INDEX idx_documents_staff     ON documents(staff_id);

-- Staff
CREATE INDEX idx_staff_org           ON staff_profiles(organization_id);
CREATE INDEX idx_staff_user          ON staff_profiles(user_id);
CREATE INDEX idx_trainings_staff     ON staff_trainings(staff_id);
CREATE INDEX idx_trainings_exp       ON staff_trainings(expiration_date);

-- Incidents
CREATE INDEX idx_incidents_org       ON incidents(organization_id);
CREATE INDEX idx_incidents_client    ON incidents(client_id);
CREATE INDEX idx_incidents_status    ON incidents(status);

-- Audit log
CREATE INDEX idx_audit_org           ON audit_logs(organization_id);
CREATE INDEX idx_audit_user          ON audit_logs(user_id);
CREATE INDEX idx_audit_action        ON audit_logs(action);
CREATE INDEX idx_audit_entity        ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created       ON audit_logs(created_at DESC);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_org_members_updated_at
  BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_packets_updated_at
  BEFORE UPDATE ON packets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_packet_forms_updated_at
  BEFORE UPDATE ON packet_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_staff_profiles_updated_at
  BEFORE UPDATE ON staff_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_staff_trainings_updated_at
  BEFORE UPDATE ON staff_trainings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_form_templates_updated_at
  BEFORE UPDATE ON form_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUTO INCIDENT NUMBER
-- ============================================================

CREATE SEQUENCE incident_number_seq START 1000;

CREATE OR REPLACE FUNCTION generate_incident_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.incident_number := 'INC-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(NEXTVAL('incident_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_incident_number
  BEFORE INSERT ON incidents
  FOR EACH ROW
  WHEN (NEW.incident_number IS NULL)
  EXECUTE FUNCTION generate_incident_number();

-- ============================================================
-- HELPER: get current user's organization_id
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS UUID AS $$
  SELECT organization_id
  FROM organization_members
  WHERE user_id = auth.uid()
    AND is_active = TRUE
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- HELPER: check if current user has role >= required role
-- ============================================================

CREATE OR REPLACE FUNCTION has_role(required_role user_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid()
      AND is_active = TRUE
      AND CASE required_role
            WHEN 'staff'           THEN role IN ('staff','program_manager','org_admin','super_admin')
            WHEN 'program_manager' THEN role IN ('program_manager','org_admin','super_admin')
            WHEN 'org_admin'       THEN role IN ('org_admin','super_admin')
            WHEN 'super_admin'     THEN role = 'super_admin'
            ELSE FALSE
          END
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- HELPER: check if current user is super_admin
-- ============================================================

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND is_active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
