-- Agent validation audit trail (intake + EVV).

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'agent_validation_run';

CREATE TABLE IF NOT EXISTS agent_validation_runs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subject_type    TEXT NOT NULL,          -- 'intake_form' | 'evv_visit'
  subject_id      UUID NOT NULL,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  trigger         TEXT NOT NULL,          -- 'form_submitted' | 'visit_clock_out' | 'daily_sweep'
  verdict         TEXT NOT NULL,          -- 'pass' | 'warn' | 'fail'
  checks          JSONB NOT NULL,
  flags           JSONB NOT NULL DEFAULT '[]'::jsonb,
  program_recommendation JSONB,
  ai_summary      TEXT,
  ai_model        TEXT,
  ai_status       TEXT NOT NULL DEFAULT 'pending', -- 'pending'|'done'|'skipped'|'error'
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_avr_org_created ON agent_validation_runs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_avr_subject ON agent_validation_runs(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_avr_verdict ON agent_validation_runs(organization_id, verdict);

ALTER TABLE agent_validation_runs ENABLE ROW LEVEL SECURITY;

-- Members read their org's runs. (get_my_org_id() exists in 202606070002_rls_policies.sql)
CREATE POLICY "avr_select_own_org"
  ON agent_validation_runs FOR SELECT
  USING (organization_id = get_my_org_id());

-- No INSERT/UPDATE/DELETE policies: writes go through the service-role admin client,
-- which bypasses RLS. This keeps the table append-only for end users (immutable audit).
