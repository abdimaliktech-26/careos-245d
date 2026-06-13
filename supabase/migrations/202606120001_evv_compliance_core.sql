-- ============================================================
-- EVV as a core compliance module
-- Adds geofence anchors, the visit workflow pipeline
-- (progress note → supervisor review → billing approval),
-- payroll/billable hours, and exception resolution fields.
-- Idempotent: safe to re-run.
-- ============================================================

-- Geofence anchor on the client service address
ALTER TABLE clients ADD COLUMN IF NOT EXISTS geo_lat DOUBLE PRECISION;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS geo_lng DOUBLE PRECISION;

-- GPS verification distances (meters from client service address)
ALTER TABLE evv_visits ADD COLUMN IF NOT EXISTS check_in_distance_m  NUMERIC;
ALTER TABLE evv_visits ADD COLUMN IF NOT EXISTS check_out_distance_m NUMERIC;

-- Optional identity verification at check-in
ALTER TABLE evv_visits ADD COLUMN IF NOT EXISTS face_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Progress note (245D service documentation)
ALTER TABLE evv_visits ADD COLUMN IF NOT EXISTS progress_note TEXT;
ALTER TABLE evv_visits ADD COLUMN IF NOT EXISTS progress_note_source TEXT
  CHECK (progress_note_source IN ('manual', 'voice', 'ai'));

-- Supervisor review
ALTER TABLE evv_visits ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (review_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE evv_visits ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE evv_visits ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE evv_visits ADD COLUMN IF NOT EXISTS review_note TEXT;

-- Billing approval and payroll hours
ALTER TABLE evv_visits ADD COLUMN IF NOT EXISTS billing_status TEXT NOT NULL DEFAULT 'not_ready'
  CHECK (billing_status IN ('not_ready', 'ready', 'approved', 'rejected'));
ALTER TABLE evv_visits ADD COLUMN IF NOT EXISTS billing_approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE evv_visits ADD COLUMN IF NOT EXISTS billing_approved_at TIMESTAMPTZ;
ALTER TABLE evv_visits ADD COLUMN IF NOT EXISTS billable_minutes INTEGER;

-- Exception resolution workflow
ALTER TABLE evv_visits ADD COLUMN IF NOT EXISTS resolution_code TEXT;
ALTER TABLE evv_visits ADD COLUMN IF NOT EXISTS resolution_note TEXT;
ALTER TABLE evv_visits ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE evv_visits ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_evv_visits_org_review  ON evv_visits(organization_id, review_status);
CREATE INDEX IF NOT EXISTS idx_evv_visits_org_billing ON evv_visits(organization_id, billing_status);

-- Ask PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
