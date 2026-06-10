-- Idempotent audit automation, notification queue, and EVV support.
-- Safe to run in Supabase SQL Editor even if part of migration 005 already exists.

DO $$ BEGIN
  CREATE TYPE audit_report_source AS ENUM ('manual', 'scheduled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_notification_channel AS ENUM ('email', 'sms');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_notification_status AS ENUM ('queued', 'sent', 'failed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE evv_visit_status AS ENUM ('scheduled', 'in_progress', 'completed', 'missed', 'exception');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS audit_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source          audit_report_source NOT NULL DEFAULT 'manual',
  generated_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  score           INTEGER NOT NULL,
  counts          JSONB NOT NULL DEFAULT '{}'::JSONB,
  findings        JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_notifications (
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

CREATE TABLE IF NOT EXISTS evv_visits (
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

CREATE INDEX IF NOT EXISTS idx_audit_reports_org_created ON audit_reports(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_notifications_org_status ON audit_notifications(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evv_visits_org_date ON evv_visits(organization_id, service_date DESC);
CREATE INDEX IF NOT EXISTS idx_evv_visits_client ON evv_visits(client_id);
CREATE INDEX IF NOT EXISTS idx_evv_visits_staff ON evv_visits(staff_id);

ALTER TABLE audit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE evv_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_reports_select_same_org" ON audit_reports;
CREATE POLICY "audit_reports_select_same_org"
  ON audit_reports FOR SELECT
  USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "audit_reports_insert_admin" ON audit_reports;
CREATE POLICY "audit_reports_insert_admin"
  ON audit_reports FOR INSERT
  WITH CHECK (organization_id = get_my_org_id() AND has_role('org_admin'));

DROP POLICY IF EXISTS "audit_notifications_select_admin" ON audit_notifications;
CREATE POLICY "audit_notifications_select_admin"
  ON audit_notifications FOR SELECT
  USING (organization_id = get_my_org_id() AND has_role('org_admin'));

DROP POLICY IF EXISTS "audit_notifications_insert_admin" ON audit_notifications;
CREATE POLICY "audit_notifications_insert_admin"
  ON audit_notifications FOR INSERT
  WITH CHECK (organization_id = get_my_org_id() AND has_role('org_admin'));

DROP POLICY IF EXISTS "evv_visits_select_same_org" ON evv_visits;
CREATE POLICY "evv_visits_select_same_org"
  ON evv_visits FOR SELECT
  USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "evv_visits_insert_staff" ON evv_visits;
CREATE POLICY "evv_visits_insert_staff"
  ON evv_visits FOR INSERT
  WITH CHECK (organization_id = get_my_org_id() AND has_role('staff'));

DROP POLICY IF EXISTS "evv_visits_update_staff" ON evv_visits;
CREATE POLICY "evv_visits_update_staff"
  ON evv_visits FOR UPDATE
  USING (organization_id = get_my_org_id() AND has_role('staff'));

DROP TRIGGER IF EXISTS trg_evv_visits_updated_at ON evv_visits;
CREATE TRIGGER trg_evv_visits_updated_at
  BEFORE UPDATE ON evv_visits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

NOTIFY pgrst, 'reload schema';
