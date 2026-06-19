CREATE TABLE IF NOT EXISTS evv_state_config (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  state_code      TEXT NOT NULL DEFAULT 'MN',
  overrides       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evv_service_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  state_code      TEXT NOT NULL,
  service_name    TEXT NOT NULL,
  procedure_code  TEXT NOT NULL,
  unit_minutes    INTEGER NOT NULL DEFAULT 15,
  aggregator_code TEXT,
  active          BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_evv_service_codes_org ON evv_service_codes(organization_id, state_code);

ALTER TABLE clients ADD COLUMN IF NOT EXISTS payer TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS medicaid_id TEXT;

ALTER TABLE evv_state_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE evv_service_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "esc_select" ON evv_state_config FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "esc_write"  ON evv_state_config FOR ALL
  USING (organization_id = get_my_org_id() AND has_role('org_admin'))
  WITH CHECK (organization_id = get_my_org_id() AND has_role('org_admin'));

CREATE POLICY "svc_select" ON evv_service_codes FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "svc_write"  ON evv_service_codes FOR ALL
  USING (organization_id = get_my_org_id() AND has_role('org_admin'))
  WITH CHECK (organization_id = get_my_org_id() AND has_role('org_admin'));
