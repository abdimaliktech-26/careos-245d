-- RLS policies for claims, service_authorizations, and webhook_logs
-- Run AFTER initial RLS migration (002) and table creation migrations

-- ============================================================
-- CLAIMS
-- ============================================================

ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "claims_select_same_org"
  ON claims FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "claims_insert_staff"
  ON claims FOR INSERT
  WITH CHECK (
    organization_id = get_my_org_id()
    AND has_role('staff')
  );

CREATE POLICY "claims_update_staff"
  ON claims FOR UPDATE
  USING (
    organization_id = get_my_org_id()
    AND has_role('staff')
  );

CREATE POLICY "claims_delete_admin"
  ON claims FOR DELETE
  USING (
    organization_id = get_my_org_id()
    AND has_role('org_admin')
  );

-- ============================================================
-- SERVICE AUTHORIZATIONS
-- ============================================================

ALTER TABLE service_authorizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_auth_select_same_org"
  ON service_authorizations FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "service_auth_insert_admin"
  ON service_authorizations FOR INSERT
  WITH CHECK (
    organization_id = get_my_org_id()
    AND has_role('program_manager')
  );

CREATE POLICY "service_auth_update_admin"
  ON service_authorizations FOR UPDATE
  USING (
    organization_id = get_my_org_id()
    AND has_role('program_manager')
  );

CREATE POLICY "service_auth_delete_admin"
  ON service_authorizations FOR DELETE
  USING (
    organization_id = get_my_org_id()
    AND has_role('org_admin')
  );

-- ============================================================
-- WEBHOOK LOGS
-- ============================================================

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_logs_select_same_org"
  ON webhook_logs FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "webhook_logs_insert_system"
  ON webhook_logs FOR INSERT
  WITH CHECK (organization_id = get_my_org_id());

-- Webhook logs are append-only; no update or delete policies
