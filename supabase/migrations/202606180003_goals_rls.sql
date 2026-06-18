-- The original goals migration (202606080017) shipped without RLS, leaving the
-- goals/goal_progress tables unprotected. Add org-scoped RLS (idempotent).

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "goals_select" ON goals;
DROP POLICY IF EXISTS "goals_write" ON goals;
CREATE POLICY "goals_select" ON goals FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "goals_write" ON goals FOR ALL
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "goal_progress_select" ON goal_progress;
DROP POLICY IF EXISTS "goal_progress_write" ON goal_progress;
CREATE POLICY "goal_progress_select" ON goal_progress FOR SELECT
  USING (EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_progress.goal_id AND g.organization_id = get_my_org_id()));
CREATE POLICY "goal_progress_write" ON goal_progress FOR ALL
  USING (EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_progress.goal_id AND g.organization_id = get_my_org_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_progress.goal_id AND g.organization_id = get_my_org_id()));
