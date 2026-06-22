-- ============================================================
-- 245D AUDIT READINESS REVIEW
-- Persisted audits, findings, and corrective action plans for the
-- Compliance-as-a-Service module. Row-level security mirrors the existing
-- org-scoped model (get_my_org_id() / has_role()). Idempotent: safe to re-run.
-- ============================================================

-- New audit-trail actions (idempotent)
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'audit_review_created';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'audit_review_completed';

-- Status enums
DO $$ BEGIN
  CREATE TYPE audit_review_status AS ENUM ('draft', 'in_progress', 'complete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE audit_risk_level AS ENUM ('high', 'moderate', 'low');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cap_status AS ENUM ('open', 'in_progress', 'complete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- AUDIT REVIEWS (one saved audit run)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_reviews (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reviewer_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_name    TEXT,
  title            TEXT NOT NULL DEFAULT 'Audit Readiness Review',
  scope            JSONB NOT NULL DEFAULT '{}'::jsonb,   -- { programs: [], notes: '' }
  status           audit_review_status NOT NULL DEFAULT 'draft',
  compliance_score INTEGER,
  findings_count   INTEGER NOT NULL DEFAULT 0,
  package_tier     TEXT,                                  -- bronze | silver | gold
  summary          TEXT,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_reviews_org ON audit_reviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_reviews_org_created ON audit_reviews(organization_id, created_at DESC);

-- ============================================================
-- AUDIT FINDINGS (individual compliance issues in a review)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_findings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_review_id     UUID NOT NULL REFERENCES audit_reviews(id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id           UUID REFERENCES clients(id) ON DELETE SET NULL,
  staff_id            UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  category            TEXT NOT NULL,                      -- 'client_documentation' | 'staff_compliance' | 'incident' ...
  regulation_category TEXT,                               -- e.g. '245D.071 Service Planning'
  risk_level          audit_risk_level NOT NULL DEFAULT 'moderate',
  finding             TEXT NOT NULL,
  recommended_action  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_findings_review ON audit_findings(audit_review_id);
CREATE INDEX IF NOT EXISTS idx_audit_findings_org ON audit_findings(organization_id);

-- ============================================================
-- CORRECTIVE ACTION PLANS (trackable remediation items)
-- ============================================================
CREATE TABLE IF NOT EXISTS corrective_action_plans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_review_id     UUID REFERENCES audit_reviews(id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  finding_id          UUID REFERENCES audit_findings(id) ON DELETE SET NULL,
  finding             TEXT NOT NULL,
  risk_level          audit_risk_level NOT NULL DEFAULT 'moderate',
  regulation_category TEXT,
  corrective_action   TEXT NOT NULL,
  responsible_person  TEXT,
  due_date            DATE,
  status              cap_status NOT NULL DEFAULT 'open',
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_caps_review ON corrective_action_plans(audit_review_id);
CREATE INDEX IF NOT EXISTS idx_caps_org ON corrective_action_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_caps_org_status ON corrective_action_plans(organization_id, status);

-- ============================================================
-- ROW LEVEL SECURITY
-- Same-org reads for all members; staff+ writes; admin deletes.
-- Mirrors the existing get_my_org_id() / has_role() policy pattern.
-- ============================================================
ALTER TABLE audit_reviews            ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_findings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrective_action_plans  ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['audit_reviews','audit_findings','corrective_action_plans'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_select_same_org', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_insert_staff', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_update_staff', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_delete_admin', t);

    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (organization_id = get_my_org_id())',
      t || '_select_same_org', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT WITH CHECK (organization_id = get_my_org_id() AND has_role(''staff''::user_role))',
      t || '_insert_staff', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE USING (organization_id = get_my_org_id() AND has_role(''staff''::user_role))',
      t || '_update_staff', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR DELETE USING (organization_id = get_my_org_id() AND has_role(''org_admin''::user_role))',
      t || '_delete_admin', t);
  END LOOP;
END $$;
