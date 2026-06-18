-- Super admin org impersonation ("enter as admin").

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'impersonation_started';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'impersonation_ended';

CREATE TABLE IF NOT EXISTS super_admin_impersonations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  super_admin_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,
  ended_at        TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_impersonation
  ON super_admin_impersonations(super_admin_id)
  WHERE ended_at IS NULL;

ALTER TABLE super_admin_impersonations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "impersonation_select_own"
  ON super_admin_impersonations FOR SELECT
  USING (super_admin_id = auth.uid());

-- get_my_org_id() now prefers an active impersonation, but ONLY for a real super admin.
CREATE OR REPLACE FUNCTION get_my_org_id() RETURNS UUID AS $$
  SELECT COALESCE(
    (SELECT i.organization_id
       FROM super_admin_impersonations i
      WHERE i.super_admin_id = auth.uid()
        AND i.ended_at IS NULL
        AND i.expires_at > NOW()
        AND is_super_admin()
      ORDER BY i.started_at DESC
      LIMIT 1),
    (SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = TRUE
      LIMIT 1)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
