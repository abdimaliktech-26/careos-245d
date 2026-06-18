CREATE TYPE service_plan_status AS ENUM ('draft','active','under_review','expired');

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'isp_created';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'isp_activated';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'isp_signed';

CREATE TABLE service_plans (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id          UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plan_type          TEXT,
  status             service_plan_status NOT NULL DEFAULT 'draft',
  assessed_needs     TEXT,
  summary            TEXT,
  effective_date     DATE,
  review_date        DATE,
  annual_review_date DATE,
  activated_at       TIMESTAMPTZ,
  created_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE plan_services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_plan_id UUID NOT NULL REFERENCES service_plans(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_name    TEXT NOT NULL,
  frequency       TEXT,
  units           TEXT,
  responsible_party TEXT,
  notes           TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE plan_outcomes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_plan_id UUID NOT NULL REFERENCES service_plans(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  goal_id         UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  UNIQUE (service_plan_id, goal_id)
);

CREATE TABLE plan_risks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_plan_id UUID NOT NULL REFERENCES service_plans(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  risk            TEXT NOT NULL,
  mitigation      TEXT,
  severity        TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE plan_signatures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_plan_id UUID NOT NULL REFERENCES service_plans(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  signer_role     TEXT NOT NULL,
  signer_name     TEXT NOT NULL,
  signer_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  signature_data  TEXT,
  signed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_plans_client ON service_plans(organization_id, client_id);
CREATE INDEX idx_service_plans_status ON service_plans(organization_id, status);
CREATE INDEX idx_plan_services_plan ON plan_services(service_plan_id);
CREATE INDEX idx_plan_outcomes_plan ON plan_outcomes(service_plan_id);
CREATE INDEX idx_plan_risks_plan ON plan_risks(service_plan_id);
CREATE INDEX idx_plan_signatures_plan ON plan_signatures(service_plan_id);

ALTER TABLE service_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_services    ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_outcomes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_risks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_signatures  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_select" ON service_plans FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "sp_write"  ON service_plans FOR ALL
  USING (organization_id = get_my_org_id() AND has_role('program_manager'))
  WITH CHECK (organization_id = get_my_org_id() AND has_role('program_manager'));

CREATE POLICY "ps_select" ON plan_services FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "ps_write"  ON plan_services FOR ALL
  USING (organization_id = get_my_org_id() AND has_role('program_manager'))
  WITH CHECK (organization_id = get_my_org_id() AND has_role('program_manager'));

CREATE POLICY "po_select" ON plan_outcomes FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "po_write"  ON plan_outcomes FOR ALL
  USING (organization_id = get_my_org_id() AND has_role('program_manager'))
  WITH CHECK (organization_id = get_my_org_id() AND has_role('program_manager'));

CREATE POLICY "pr_select" ON plan_risks FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "pr_write"  ON plan_risks FOR ALL
  USING (organization_id = get_my_org_id() AND has_role('program_manager'))
  WITH CHECK (organization_id = get_my_org_id() AND has_role('program_manager'));

CREATE POLICY "psig_select" ON plan_signatures FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "psig_write"  ON plan_signatures FOR ALL
  USING (organization_id = get_my_org_id() AND has_role('program_manager'))
  WITH CHECK (organization_id = get_my_org_id() AND has_role('program_manager'));
