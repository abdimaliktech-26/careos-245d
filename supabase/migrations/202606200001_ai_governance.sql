ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'ai_generation';

CREATE TABLE IF NOT EXISTS org_ai_settings (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  ai_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  monthly_limit   INTEGER NOT NULL DEFAULT 2000,
  features        JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feature         TEXT NOT NULL,
  provider        TEXT,
  model           TEXT,
  status          TEXT NOT NULL,
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_audit_org_created ON ai_audit_logs(organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_usage_counters (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period          TEXT NOT NULL,
  count           INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (organization_id, period)
);

CREATE OR REPLACE FUNCTION increment_ai_usage(p_org UUID, p_period TEXT)
RETURNS INTEGER AS $$
  INSERT INTO ai_usage_counters (organization_id, period, count) VALUES (p_org, p_period, 1)
  ON CONFLICT (organization_id, period) DO UPDATE SET count = ai_usage_counters.count + 1
  RETURNING count;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

ALTER TABLE org_ai_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_audit_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_counters  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oas_select" ON org_ai_settings FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "oas_write"  ON org_ai_settings FOR ALL
  USING (organization_id = get_my_org_id() AND has_role('org_admin'))
  WITH CHECK (organization_id = get_my_org_id() AND has_role('org_admin'));

CREATE POLICY "aal_select" ON ai_audit_logs FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "auc_select" ON ai_usage_counters FOR SELECT USING (organization_id = get_my_org_id());

REVOKE EXECUTE ON FUNCTION increment_ai_usage(UUID, TEXT) FROM PUBLIC, anon, authenticated;
