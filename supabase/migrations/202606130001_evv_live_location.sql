-- ============================================================
-- EVV Live Location Tracking
--
-- Continuous GPS breadcrumbs for an ACTIVE (in-progress) visit, used to drive
-- the live map. Privacy posture (deliberate, HIPAA-aware):
--   - Pings exist ONLY while a visit is in_progress. The client watcher stops
--     on check-out, so tracking never happens off-shift.
--   - INSERT is locked to the visit's assigned caregiver (auth.uid() must match
--     staff_profiles.user_id of the visit's staff) AND the visit must be
--     in_progress. No one can fabricate someone else's location.
--   - Caregiver consent is recorded on organization_members.location_consent_at.
--   - Pings are short-lived: purged 7 days after the visit leaves in_progress
--     (the durable record is the two stored check_in/out points on evv_visits).
-- Idempotent: safe to re-run.
-- ============================================================

-- One-time caregiver consent to active-visit location sharing.
ALTER TABLE organization_members
  ADD COLUMN IF NOT EXISTS location_consent_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS evv_location_pings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  visit_id        UUID NOT NULL REFERENCES evv_visits(id) ON DELETE CASCADE,
  staff_id        UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  accuracy        REAL,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evv_pings_visit
  ON evv_location_pings(visit_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_evv_pings_org_time
  ON evv_location_pings(organization_id, recorded_at DESC);

ALTER TABLE evv_location_pings ENABLE ROW LEVEL SECURITY;

-- Tenants read their own org's pings (drives the live map).
DROP POLICY IF EXISTS "evv_pings_select_same_org" ON evv_location_pings;
CREATE POLICY "evv_pings_select_same_org"
  ON evv_location_pings FOR SELECT
  USING (organization_id = get_my_org_id());

-- Only the assigned caregiver of an in-progress visit may insert pings.
DROP POLICY IF EXISTS "evv_pings_insert_assigned_staff" ON evv_location_pings;
CREATE POLICY "evv_pings_insert_assigned_staff"
  ON evv_location_pings FOR INSERT
  WITH CHECK (
    organization_id = get_my_org_id()
    AND EXISTS (
      SELECT 1
      FROM evv_visits v
      JOIN staff_profiles sp ON sp.id = v.staff_id
      WHERE v.id = visit_id
        AND v.organization_id = get_my_org_id()
        AND v.status = 'in_progress'
        AND sp.user_id = auth.uid()
    )
  );

-- Emit row changes so the live map can subscribe via realtime.
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE evv_location_pings;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- Purge breadcrumbs once a visit is no longer active (keep 7 days for review).
CREATE OR REPLACE FUNCTION purge_stale_location_pings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted INTEGER;
BEGIN
  DELETE FROM evv_location_pings p
  USING evv_visits v
  WHERE p.visit_id = v.id
    AND v.status <> 'in_progress'
    AND p.recorded_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

NOTIFY pgrst, 'reload schema';
