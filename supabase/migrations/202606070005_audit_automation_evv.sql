-- ============================================================
-- Audit automation, notification queue, and EVV support
-- ============================================================

CREATE TYPE audit_report_source AS ENUM (
  'manual',
  'scheduled'
);

CREATE TYPE audit_notification_channel AS ENUM (
  'email',
  'sms'
);

CREATE TYPE audit_notification_status AS ENUM (
  'queued',
  'sent',
  'failed',
  'skipped'
);

CREATE TYPE evv_visit_status AS ENUM (
  'scheduled',
  'in_progress',
  'completed',
  'missed',
  'exception'
);

CREATE TABLE audit_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source          audit_report_source NOT NULL DEFAULT 'manual',
  generated_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  score           INTEGER NOT NULL,
  counts          JSONB NOT NULL DEFAULT '{}'::JSONB,
  findings        JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_report_id UUID REFERENCES audit_reports(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel         audit_notification_channel NOT NULL,
  recipient       TEXT NOT NULL,
  subject         TEXT,
  message         TEXT NOT NULL,
  severity        TEXT,
  status          audit_notification_status NOT NULL DEFAULT 'queued',
  provider        TEXT,
  provider_message_id TEXT,
  error           TEXT,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE evv_visits (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  staff_id        UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  packet_id       UUID REFERENCES packets(id) ON DELETE SET NULL,
  service_name    TEXT,
  service_date    DATE NOT NULL,
  scheduled_start TIMESTAMPTZ,
  scheduled_end   TIMESTAMPTZ,
  actual_start    TIMESTAMPTZ,
  actual_end      TIMESTAMPTZ,
  check_in_method TEXT,
  check_out_method TEXT,
  check_in_location JSONB,
  check_out_location JSONB,
  status          evv_visit_status NOT NULL DEFAULT 'scheduled',
  exception_reason TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_reports_org_created ON audit_reports(organization_id, created_at DESC);
CREATE INDEX idx_audit_notifications_org_status ON audit_notifications(organization_id, status, created_at DESC);
CREATE INDEX idx_evv_visits_org_date ON evv_visits(organization_id, service_date DESC);
CREATE INDEX idx_evv_visits_client ON evv_visits(client_id);
CREATE INDEX idx_evv_visits_staff ON evv_visits(staff_id);

ALTER TABLE audit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE evv_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_reports_select_same_org"
  ON audit_reports FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "audit_reports_insert_admin"
  ON audit_reports FOR INSERT
  WITH CHECK (organization_id = get_my_org_id() AND has_role('org_admin'));

CREATE POLICY "audit_notifications_select_admin"
  ON audit_notifications FOR SELECT
  USING (organization_id = get_my_org_id() AND has_role('org_admin'));

CREATE POLICY "audit_notifications_insert_admin"
  ON audit_notifications FOR INSERT
  WITH CHECK (organization_id = get_my_org_id() AND has_role('org_admin'));

CREATE POLICY "evv_visits_select_same_org"
  ON evv_visits FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "evv_visits_insert_staff"
  ON evv_visits FOR INSERT
  WITH CHECK (organization_id = get_my_org_id() AND has_role('staff'));

CREATE POLICY "evv_visits_update_staff"
  ON evv_visits FOR UPDATE
  USING (organization_id = get_my_org_id() AND has_role('staff'));

CREATE TRIGGER trg_evv_visits_updated_at
  BEFORE UPDATE ON evv_visits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
