-- ============================================================
-- eMAR + PHARMACY PORTAL
-- Medication Administration Records, pharmacy portal, medication
-- order flow, refills, secure messaging, pharmacy documents, and
-- compliance alerts.
--
-- Security model mirrors the existing org-scoped RLS:
--   - Provider side: organization_id = get_my_org_id() + has_role()
--   - Pharmacy side: NEW helpers get_my_pharmacy_id() / pharmacy_has_org_access()
-- Pharmacy users live OUTSIDE organization_members (in pharmacy_users) and
-- reach a provider's data only through an APPROVED provider_pharmacy_link
-- and, for client data, a client_pharmacy_assignment. No cross-tenant leak.
--
-- Idempotent: safe to re-run.
-- ============================================================

-- ------------------------------------------------------------
-- New roles (added to user_role; NOT referenced as literals in this
-- migration to avoid "unsafe use of new enum value in same txn").
-- ------------------------------------------------------------
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'pharmacy_admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'pharmacy_staff';

-- New audit-trail actions
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'medication_created';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'medication_updated';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'medication_discontinued';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'medication_administered';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'medication_order_submitted';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'medication_order_reviewed';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'refill_requested';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'refill_updated';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'pharmacy_document_uploaded';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'pharmacy_message_sent';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'pharmacy_invited';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'pharmacy_access_changed';

-- ------------------------------------------------------------
-- ENUMS (idempotent)
-- ------------------------------------------------------------
DO $$ BEGIN CREATE TYPE pharmacy_role AS ENUM ('pharmacy_admin','pharmacy_staff'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE pharmacy_link_status AS ENUM ('invited','pending','approved','rejected','suspended'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE medication_status AS ENUM ('active','discontinued','expired','pending'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE medication_order_status AS ENUM ('draft','submitted','pending_review','approved','rejected','needs_clarification','active','discontinued'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE med_admin_status AS ENUM ('given','refused','held','missed','not_available','late','error'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE med_task_status AS ENUM ('pending','completed','missed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE refill_status AS ENUM ('requested','received','processing','waiting_physician','filled','shipped','delivered','denied','needs_clarification'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE refill_urgency AS ENUM ('routine','urgent','emergency'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE pharmacy_document_category AS ENUM ('prescription_order','physician_order','medication_change','discontinuation_order','refill_authorization','delivery_receipt','mar_sheet','controlled_substance_log','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE med_alert_type AS ENUM ('missed_medication','late_medication','missing_physician_order','expired_medication','refill_risk','prn_missing_outcome','controlled_substance_discrepancy','order_not_reviewed','pharmacy_delivery_delay','medication_error_pattern'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE med_alert_status AS ENUM ('open','acknowledged','resolved'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- PHARMACIES  (independent tenant root for the pharmacy side)
-- ============================================================
CREATE TABLE IF NOT EXISTS pharmacies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  npi           TEXT,
  dea_number    TEXT,
  address       TEXT,
  city          TEXT,
  state         TEXT DEFAULT 'MN',
  zip           TEXT,
  phone         TEXT,
  email         TEXT,
  contact_name  TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================================
-- PHARMACY USERS  (pharmacy-side membership; mirrors organization_members)
-- ============================================================
CREATE TABLE IF NOT EXISTS pharmacy_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role NOT NULL,             -- pharmacy_admin | pharmacy_staff
  full_name   TEXT,
  email       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pharmacy_user ON pharmacy_users(pharmacy_id, user_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_users_user ON pharmacy_users(user_id);

-- ============================================================
-- PROVIDER <-> PHARMACY LINKS  (org grants a pharmacy access)
-- ============================================================
CREATE TABLE IF NOT EXISTS provider_pharmacy_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pharmacy_id     UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  status          pharmacy_link_status NOT NULL DEFAULT 'invited',
  invited_email   TEXT,
  invited_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_provider_pharmacy ON provider_pharmacy_links(organization_id, pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_ppl_pharmacy ON provider_pharmacy_links(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_ppl_org ON provider_pharmacy_links(organization_id);

-- ============================================================
-- CLIENT <-> PHARMACY ASSIGNMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS client_pharmacy_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  pharmacy_id     UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_client_pharmacy ON client_pharmacy_assignments(client_id, pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_cpa_org ON client_pharmacy_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_cpa_pharmacy ON client_pharmacy_assignments(pharmacy_id);

-- ============================================================
-- MEDICATIONS  (the medication profile)
-- ============================================================
CREATE TABLE IF NOT EXISTS medications (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  generic_name          TEXT,
  dosage                TEXT,
  route                 TEXT,
  frequency             TEXT,
  administration_times  TEXT[] NOT NULL DEFAULT '{}',   -- e.g. {'08:00','20:00'}
  start_date            DATE,
  end_date              DATE,
  prescribing_physician TEXT,
  pharmacy_id           UUID REFERENCES pharmacies(id) ON DELETE SET NULL,
  is_prn                BOOLEAN NOT NULL DEFAULT FALSE,
  is_controlled         BOOLEAN NOT NULL DEFAULT FALSE,
  special_instructions  TEXT,
  status                medication_status NOT NULL DEFAULT 'active',
  physician_order_document_id UUID,            -- soft ref to pharmacy_documents
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_medications_org ON medications(organization_id);
CREATE INDEX IF NOT EXISTS idx_medications_client ON medications(client_id);
CREATE INDEX IF NOT EXISTS idx_medications_status ON medications(organization_id, status);

-- ============================================================
-- MEDICATION ORDERS  (pharmacy-submitted, provider-reviewed)
-- ============================================================
CREATE TABLE IF NOT EXISTS medication_orders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pharmacy_id        UUID REFERENCES pharmacies(id) ON DELETE SET NULL,
  client_id          UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  medication_id      UUID REFERENCES medications(id) ON DELETE SET NULL,  -- set on conversion
  status             medication_order_status NOT NULL DEFAULT 'draft',
  payload            JSONB NOT NULL DEFAULT '{}'::jsonb,                  -- proposed medication fields
  notes              TEXT,
  clarification_note TEXT,
  submitted_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at       TIMESTAMPTZ,
  reviewed_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_med_orders_org ON medication_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_med_orders_pharmacy ON medication_orders(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_med_orders_status ON medication_orders(organization_id, status);

-- ============================================================
-- MEDICATION SCHEDULES  (recurring times derived from a medication)
-- ============================================================
CREATE TABLE IF NOT EXISTS medication_schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  medication_id   UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  time_of_day     TEXT NOT NULL,               -- 'HH:MM'
  days_of_week    INT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',  -- 0=Sun
  is_prn          BOOLEAN NOT NULL DEFAULT FALSE,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_med_sched_med ON medication_schedules(medication_id);
CREATE INDEX IF NOT EXISTS idx_med_sched_org ON medication_schedules(organization_id);

-- ============================================================
-- MEDICATION PASS TASKS  (generated daily tasks for staff)
-- ============================================================
CREATE TABLE IF NOT EXISTS medication_pass_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  medication_id   UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  schedule_id     UUID REFERENCES medication_schedules(id) ON DELETE SET NULL,
  due_at          TIMESTAMPTZ NOT NULL,
  status          med_task_status NOT NULL DEFAULT 'pending',
  record_id       UUID,                         -- soft ref to MAR row on completion
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_med_task ON medication_pass_tasks(medication_id, due_at);
CREATE INDEX IF NOT EXISTS idx_med_tasks_org_due ON medication_pass_tasks(organization_id, due_at);
CREATE INDEX IF NOT EXISTS idx_med_tasks_client ON medication_pass_tasks(client_id, due_at);

-- ============================================================
-- MEDICATION ADMINISTRATION RECORDS  (the eMAR event log)
-- ============================================================
CREATE TABLE IF NOT EXISTS medication_administration_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  medication_id   UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  schedule_id     UUID REFERENCES medication_schedules(id) ON DELETE SET NULL,
  task_id         UUID REFERENCES medication_pass_tasks(id) ON DELETE SET NULL,
  status          med_admin_status NOT NULL,
  scheduled_for   TIMESTAMPTZ,
  administered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  staff_id        UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  signature       TEXT,                          -- staff electronic signature
  notes           TEXT,
  reason          TEXT,                          -- if refused/held/missed
  prn_reason      TEXT,
  prn_outcome     TEXT,
  pain_before     INT,
  pain_after      INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_mar_org ON medication_administration_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_mar_client ON medication_administration_records(client_id, administered_at DESC);
CREATE INDEX IF NOT EXISTS idx_mar_med ON medication_administration_records(medication_id);
CREATE INDEX IF NOT EXISTS idx_mar_status ON medication_administration_records(organization_id, status);

-- ============================================================
-- REFILL REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS refill_requests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id          UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  medication_id      UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  pharmacy_id        UUID REFERENCES pharmacies(id) ON DELETE SET NULL,
  quantity_remaining INT,
  days_remaining     INT,
  urgency            refill_urgency NOT NULL DEFAULT 'routine',
  notes              TEXT,
  status             refill_status NOT NULL DEFAULT 'requested',
  pharmacy_response  TEXT,
  requested_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  responded_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refills_org ON refill_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_refills_pharmacy ON refill_requests(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_refills_status ON refill_requests(organization_id, status);

-- ============================================================
-- PHARMACY DOCUMENTS  (client-linked, pharmacy-linked)
-- ============================================================
CREATE TABLE IF NOT EXISTS pharmacy_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  pharmacy_id     UUID REFERENCES pharmacies(id) ON DELETE SET NULL,
  medication_id   UUID REFERENCES medications(id) ON DELETE SET NULL,
  category        pharmacy_document_category NOT NULL DEFAULT 'other',
  display_name    TEXT NOT NULL,
  description     TEXT,
  storage_bucket  TEXT NOT NULL DEFAULT 'documents',
  storage_path    TEXT NOT NULL,
  file_size       BIGINT,
  mime_type       TEXT,
  uploaded_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_by_role TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pharm_docs_org ON pharmacy_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_pharm_docs_client ON pharmacy_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_pharm_docs_pharmacy ON pharmacy_documents(pharmacy_id);

-- ============================================================
-- PHARMACY MESSAGES  (secure provider <-> pharmacy messaging)
-- ============================================================
CREATE TABLE IF NOT EXISTS pharmacy_messages (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pharmacy_id        UUID REFERENCES pharmacies(id) ON DELETE SET NULL,
  client_id          UUID REFERENCES clients(id) ON DELETE CASCADE,
  medication_id      UUID REFERENCES medications(id) ON DELETE SET NULL,
  refill_request_id  UUID REFERENCES refill_requests(id) ON DELETE SET NULL,
  medication_order_id UUID REFERENCES medication_orders(id) ON DELETE SET NULL,
  sender_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role        TEXT,
  recipient_role     TEXT,
  body               TEXT NOT NULL,
  attachments        JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_read            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pharm_msgs_org ON pharmacy_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_pharm_msgs_pharmacy ON pharmacy_messages(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharm_msgs_client ON pharmacy_messages(client_id);

-- ============================================================
-- MEDICATION AUDIT LOGS  (dedicated before/after trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS medication_audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role      TEXT,
  action          TEXT NOT NULL,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  medication_id   UUID REFERENCES medications(id) ON DELETE SET NULL,
  entity_type     TEXT,
  entity_id       UUID,
  previous_value  JSONB,
  new_value       JSONB,
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_med_audit_org ON medication_audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_med_audit_client ON medication_audit_logs(client_id);

-- ============================================================
-- MEDICATION COMPLIANCE ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS medication_compliance_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  medication_id   UUID REFERENCES medications(id) ON DELETE SET NULL,
  staff_id        UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  pharmacy_id     UUID REFERENCES pharmacies(id) ON DELETE SET NULL,
  alert_type      med_alert_type NOT NULL,
  severity        TEXT NOT NULL DEFAULT 'medium',
  status          med_alert_status NOT NULL DEFAULT 'open',
  title           TEXT NOT NULL,
  detail          TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_med_alerts_org ON medication_compliance_alerts(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_med_alerts_client ON medication_compliance_alerts(client_id);

-- ============================================================
-- PHARMACY-SIDE RLS HELPERS
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_pharmacy_id() RETURNS UUID AS $$
  SELECT pharmacy_id FROM pharmacy_users
   WHERE user_id = auth.uid() AND is_active = TRUE
   LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_pharmacy_user() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM pharmacy_users
     WHERE user_id = auth.uid() AND is_active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- True when the current pharmacy user has an APPROVED link to org_id.
CREATE OR REPLACE FUNCTION pharmacy_has_org_access(org_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM provider_pharmacy_links l
     WHERE l.pharmacy_id = get_my_pharmacy_id()
       AND l.organization_id = org_id
       AND l.status = 'approved'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- True when the current pharmacy user is assigned to client_id (via an
-- approved org link + a client assignment).
CREATE OR REPLACE FUNCTION pharmacy_has_client_access(cl_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
      FROM client_pharmacy_assignments a
      JOIN provider_pharmacy_links l
        ON l.organization_id = a.organization_id
       AND l.pharmacy_id = a.pharmacy_id
     WHERE a.pharmacy_id = get_my_pharmacy_id()
       AND a.client_id = cl_id
       AND l.status = 'approved'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE pharmacies                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_users                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_pharmacy_links            ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_pharmacy_assignments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_orders                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_schedules               ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_pass_tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_administration_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE refill_requests                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_documents                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_messages                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_audit_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_compliance_alerts       ENABLE ROW LEVEL SECURITY;

-- ---- pharmacies: own pharmacy, super admin, or a linked provider org member
DROP POLICY IF EXISTS pharmacies_select ON pharmacies;
CREATE POLICY pharmacies_select ON pharmacies FOR SELECT USING (
  is_super_admin()
  OR id = get_my_pharmacy_id()
  OR EXISTS (SELECT 1 FROM provider_pharmacy_links l
              WHERE l.pharmacy_id = pharmacies.id
                AND l.organization_id = get_my_org_id())
);
DROP POLICY IF EXISTS pharmacies_insert ON pharmacies;
CREATE POLICY pharmacies_insert ON pharmacies FOR INSERT WITH CHECK (
  is_super_admin() OR has_role('org_admin'::user_role)
);
DROP POLICY IF EXISTS pharmacies_update ON pharmacies;
CREATE POLICY pharmacies_update ON pharmacies FOR UPDATE USING (
  is_super_admin() OR id = get_my_pharmacy_id()
);

-- ---- pharmacy_users: same pharmacy or super admin
DROP POLICY IF EXISTS pharmacy_users_select ON pharmacy_users;
CREATE POLICY pharmacy_users_select ON pharmacy_users FOR SELECT USING (
  is_super_admin() OR pharmacy_id = get_my_pharmacy_id()
);
DROP POLICY IF EXISTS pharmacy_users_write ON pharmacy_users;
CREATE POLICY pharmacy_users_write ON pharmacy_users FOR ALL USING (
  is_super_admin() OR pharmacy_id = get_my_pharmacy_id()
) WITH CHECK (
  is_super_admin() OR pharmacy_id = get_my_pharmacy_id()
);

-- ---- provider_pharmacy_links: provider org members + the linked pharmacy
DROP POLICY IF EXISTS ppl_select ON provider_pharmacy_links;
CREATE POLICY ppl_select ON provider_pharmacy_links FOR SELECT USING (
  organization_id = get_my_org_id() OR pharmacy_id = get_my_pharmacy_id()
);
DROP POLICY IF EXISTS ppl_insert ON provider_pharmacy_links;
CREATE POLICY ppl_insert ON provider_pharmacy_links FOR INSERT WITH CHECK (
  organization_id = get_my_org_id() AND has_role('org_admin'::user_role)
);
DROP POLICY IF EXISTS ppl_update ON provider_pharmacy_links;
CREATE POLICY ppl_update ON provider_pharmacy_links FOR UPDATE USING (
  (organization_id = get_my_org_id() AND has_role('org_admin'::user_role))
  OR pharmacy_id = get_my_pharmacy_id()
);
DROP POLICY IF EXISTS ppl_delete ON provider_pharmacy_links;
CREATE POLICY ppl_delete ON provider_pharmacy_links FOR DELETE USING (
  organization_id = get_my_org_id() AND has_role('org_admin'::user_role)
);

-- ---- client_pharmacy_assignments: provider org + assigned pharmacy
DROP POLICY IF EXISTS cpa_select ON client_pharmacy_assignments;
CREATE POLICY cpa_select ON client_pharmacy_assignments FOR SELECT USING (
  organization_id = get_my_org_id() OR pharmacy_id = get_my_pharmacy_id()
);
DROP POLICY IF EXISTS cpa_write ON client_pharmacy_assignments;
CREATE POLICY cpa_write ON client_pharmacy_assignments FOR ALL USING (
  organization_id = get_my_org_id() AND has_role('org_admin'::user_role)
) WITH CHECK (
  organization_id = get_my_org_id() AND has_role('org_admin'::user_role)
);

-- ---- medications: org members (rw by staff+) + read for assigned pharmacy
DROP POLICY IF EXISTS medications_select ON medications;
CREATE POLICY medications_select ON medications FOR SELECT USING (
  organization_id = get_my_org_id() OR pharmacy_has_client_access(client_id)
);
DROP POLICY IF EXISTS medications_insert ON medications;
CREATE POLICY medications_insert ON medications FOR INSERT WITH CHECK (
  organization_id = get_my_org_id() AND has_role('staff'::user_role)
);
DROP POLICY IF EXISTS medications_update ON medications;
CREATE POLICY medications_update ON medications FOR UPDATE USING (
  organization_id = get_my_org_id() AND has_role('staff'::user_role)
);
DROP POLICY IF EXISTS medications_delete ON medications;
CREATE POLICY medications_delete ON medications FOR DELETE USING (
  organization_id = get_my_org_id() AND has_role('org_admin'::user_role)
);

-- ---- medication_orders: org members + assigned pharmacy (pharmacy may insert/update)
DROP POLICY IF EXISTS med_orders_select ON medication_orders;
CREATE POLICY med_orders_select ON medication_orders FOR SELECT USING (
  organization_id = get_my_org_id() OR pharmacy_has_org_access(organization_id)
);
DROP POLICY IF EXISTS med_orders_insert ON medication_orders;
CREATE POLICY med_orders_insert ON medication_orders FOR INSERT WITH CHECK (
  (organization_id = get_my_org_id() AND has_role('staff'::user_role))
  OR pharmacy_has_client_access(client_id)
);
DROP POLICY IF EXISTS med_orders_update ON medication_orders;
CREATE POLICY med_orders_update ON medication_orders FOR UPDATE USING (
  (organization_id = get_my_org_id() AND has_role('staff'::user_role))
  OR pharmacy_has_org_access(organization_id)
);

-- ---- medication_schedules: org-internal only
DROP POLICY IF EXISTS med_sched_select ON medication_schedules;
CREATE POLICY med_sched_select ON medication_schedules FOR SELECT USING (organization_id = get_my_org_id());
DROP POLICY IF EXISTS med_sched_write ON medication_schedules;
CREATE POLICY med_sched_write ON medication_schedules FOR ALL USING (
  organization_id = get_my_org_id() AND has_role('staff'::user_role)
) WITH CHECK (
  organization_id = get_my_org_id() AND has_role('staff'::user_role)
);

-- ---- medication_pass_tasks: org-internal only
DROP POLICY IF EXISTS med_tasks_select ON medication_pass_tasks;
CREATE POLICY med_tasks_select ON medication_pass_tasks FOR SELECT USING (organization_id = get_my_org_id());
DROP POLICY IF EXISTS med_tasks_write ON medication_pass_tasks;
CREATE POLICY med_tasks_write ON medication_pass_tasks FOR ALL USING (
  organization_id = get_my_org_id() AND has_role('staff'::user_role)
) WITH CHECK (
  organization_id = get_my_org_id() AND has_role('staff'::user_role)
);

-- ---- MAR: org-internal; staff insert; immutable thereafter (admin can correct)
DROP POLICY IF EXISTS mar_select ON medication_administration_records;
CREATE POLICY mar_select ON medication_administration_records FOR SELECT USING (organization_id = get_my_org_id());
DROP POLICY IF EXISTS mar_insert ON medication_administration_records;
CREATE POLICY mar_insert ON medication_administration_records FOR INSERT WITH CHECK (
  organization_id = get_my_org_id() AND has_role('staff'::user_role)
);
DROP POLICY IF EXISTS mar_update ON medication_administration_records;
CREATE POLICY mar_update ON medication_administration_records FOR UPDATE USING (
  organization_id = get_my_org_id() AND has_role('org_admin'::user_role)
);

-- ---- refill_requests: org members + assigned pharmacy (pharmacy responds)
DROP POLICY IF EXISTS refills_select ON refill_requests;
CREATE POLICY refills_select ON refill_requests FOR SELECT USING (
  organization_id = get_my_org_id() OR pharmacy_has_org_access(organization_id)
);
DROP POLICY IF EXISTS refills_insert ON refill_requests;
CREATE POLICY refills_insert ON refill_requests FOR INSERT WITH CHECK (
  organization_id = get_my_org_id() AND has_role('staff'::user_role)
);
DROP POLICY IF EXISTS refills_update ON refill_requests;
CREATE POLICY refills_update ON refill_requests FOR UPDATE USING (
  (organization_id = get_my_org_id() AND has_role('staff'::user_role))
  OR pharmacy_has_org_access(organization_id)
);

-- ---- pharmacy_documents: org members + assigned pharmacy (both upload)
DROP POLICY IF EXISTS pharm_docs_select ON pharmacy_documents;
CREATE POLICY pharm_docs_select ON pharmacy_documents FOR SELECT USING (
  organization_id = get_my_org_id() OR pharmacy_has_client_access(client_id)
);
DROP POLICY IF EXISTS pharm_docs_insert ON pharmacy_documents;
CREATE POLICY pharm_docs_insert ON pharmacy_documents FOR INSERT WITH CHECK (
  (organization_id = get_my_org_id() AND has_role('staff'::user_role))
  OR pharmacy_has_client_access(client_id)
);
DROP POLICY IF EXISTS pharm_docs_delete ON pharmacy_documents;
CREATE POLICY pharm_docs_delete ON pharmacy_documents FOR DELETE USING (
  organization_id = get_my_org_id() AND has_role('org_admin'::user_role)
);

-- ---- pharmacy_messages: org members + linked pharmacy
DROP POLICY IF EXISTS pharm_msgs_select ON pharmacy_messages;
CREATE POLICY pharm_msgs_select ON pharmacy_messages FOR SELECT USING (
  organization_id = get_my_org_id() OR pharmacy_has_org_access(organization_id)
);
DROP POLICY IF EXISTS pharm_msgs_insert ON pharmacy_messages;
CREATE POLICY pharm_msgs_insert ON pharmacy_messages FOR INSERT WITH CHECK (
  (organization_id = get_my_org_id() AND has_role('staff'::user_role))
  OR pharmacy_has_org_access(organization_id)
);
DROP POLICY IF EXISTS pharm_msgs_update ON pharmacy_messages;
CREATE POLICY pharm_msgs_update ON pharmacy_messages FOR UPDATE USING (
  organization_id = get_my_org_id() OR pharmacy_has_org_access(organization_id)
);

-- ---- medication_audit_logs: org read; insert by staff+ (writes happen server-side)
DROP POLICY IF EXISTS med_audit_select ON medication_audit_logs;
CREATE POLICY med_audit_select ON medication_audit_logs FOR SELECT USING (organization_id = get_my_org_id());
DROP POLICY IF EXISTS med_audit_insert ON medication_audit_logs;
CREATE POLICY med_audit_insert ON medication_audit_logs FOR INSERT WITH CHECK (organization_id = get_my_org_id());

-- ---- medication_compliance_alerts: org-internal
DROP POLICY IF EXISTS med_alerts_select ON medication_compliance_alerts;
CREATE POLICY med_alerts_select ON medication_compliance_alerts FOR SELECT USING (organization_id = get_my_org_id());
DROP POLICY IF EXISTS med_alerts_write ON medication_compliance_alerts;
CREATE POLICY med_alerts_write ON medication_compliance_alerts FOR ALL USING (
  organization_id = get_my_org_id() AND has_role('staff'::user_role)
) WITH CHECK (
  organization_id = get_my_org_id() AND has_role('staff'::user_role)
);

-- ============================================================
-- updated_at triggers (reuse existing set_updated_at() if present)
-- ============================================================
DO $$
DECLARE t TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    FOREACH t IN ARRAY ARRAY[
      'pharmacies','pharmacy_users','provider_pharmacy_links','client_pharmacy_assignments',
      'medications','medication_orders','medication_schedules','medication_pass_tasks',
      'refill_requests','pharmacy_documents','medication_compliance_alerts'
    ] LOOP
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I', t, t);
      EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
    END LOOP;
  END IF;
END $$;
