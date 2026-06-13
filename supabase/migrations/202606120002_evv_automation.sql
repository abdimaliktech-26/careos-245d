-- ============================================================
-- EVV automation layer
-- - Links schedules to the EVV pipeline (create_evv flag + visit link)
-- - Lets compliance alerts reference an EVV visit (exceptions → alerts)
-- Idempotent: safe to re-run.
-- ============================================================

-- Staffing → EVV: opt a schedule into auto-generating an EVV visit,
-- and remember which visit it produced (so we don't duplicate).
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS create_evv BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS evv_visit_id UUID
  REFERENCES evv_visits(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_schedules_evv_visit ON schedules(evv_visit_id);

-- EVV exceptions surface in the org compliance-alert feed.
ALTER TABLE compliance_alerts ADD COLUMN IF NOT EXISTS related_evv_visit_id UUID
  REFERENCES evv_visits(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_compliance_alerts_evv_visit
  ON compliance_alerts(related_evv_visit_id);

-- Ask PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
