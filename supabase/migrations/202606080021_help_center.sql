-- ============================================================
-- Stillwater 245D Suite — Help Center / Knowledge Base
-- ============================================================

CREATE TABLE IF NOT EXISTS help_articles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  content         TEXT NOT NULL,
  excerpt         TEXT,
  category        TEXT NOT NULL DEFAULT 'general',
  tags            TEXT[] DEFAULT '{}',
  is_published    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  updated_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_help_org       ON help_articles(organization_id);
CREATE INDEX idx_help_category  ON help_articles(category);
CREATE INDEX idx_help_published ON help_articles(is_published);
CREATE INDEX idx_help_slug      ON help_articles(slug);

-- Updated_at trigger
CREATE TRIGGER trg_help_articles_updated_at
  BEFORE UPDATE ON help_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE help_articles ENABLE ROW LEVEL SECURITY;

-- Everyone in the org can read published articles
CREATE POLICY "help_articles_select_published"
  ON help_articles FOR SELECT
  USING (
    (is_published = TRUE AND organization_id = get_my_org_id())
    OR (is_published = TRUE AND organization_id IS NULL)
  );

-- Org admins can read all articles in their org (including drafts)
CREATE POLICY "help_articles_select_admin"
  ON help_articles FOR SELECT
  USING (
    organization_id = get_my_org_id()
    AND has_role('org_admin')
  );

-- Super admins can read everything
CREATE POLICY "help_articles_select_super_admin"
  ON help_articles FOR SELECT
  USING (is_super_admin());

-- Org admins can create articles in their org
CREATE POLICY "help_articles_insert_admin"
  ON help_articles FOR INSERT
  WITH CHECK (
    organization_id = get_my_org_id()
    AND has_role('org_admin')
    AND created_by = auth.uid()
  );

-- Super admins can create articles in any org or with NULL org (global)
CREATE POLICY "help_articles_insert_super_admin"
  ON help_articles FOR INSERT
  WITH CHECK (is_super_admin());

-- Org admins can update articles in their org
CREATE POLICY "help_articles_update_admin"
  ON help_articles FOR UPDATE
  USING (
    organization_id = get_my_org_id()
    AND has_role('org_admin')
  );

-- Super admins can update any article
CREATE POLICY "help_articles_update_super_admin"
  ON help_articles FOR UPDATE
  USING (is_super_admin());

-- Org admins can delete articles in their org
CREATE POLICY "help_articles_delete_admin"
  ON help_articles FOR DELETE
  USING (
    organization_id = get_my_org_id()
    AND has_role('org_admin')
  );

-- Super admins can delete any article
CREATE POLICY "help_articles_delete_super_admin"
  ON help_articles FOR DELETE
  USING (is_super_admin());
