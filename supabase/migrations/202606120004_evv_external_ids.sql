-- ============================================================
-- EVV aggregator external identifiers
--
-- The aggregator bills by the IDs IT knows the recipient and caregiver by,
-- not our internal UUIDs:
--   - client: Medicaid/MA recipient number (clients.medicaid_number — exists)
--   - caregiver: the EVV caregiver id (UMPI / registry id) — added here
-- Idempotent: safe to re-run.
-- ============================================================

ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS caregiver_id TEXT;

COMMENT ON COLUMN staff_profiles.caregiver_id IS
  'EVV aggregator caregiver identifier (e.g. Minnesota UMPI / caregiver registry id). Required to transmit a staffed visit.';

NOTIFY pgrst, 'reload schema';
