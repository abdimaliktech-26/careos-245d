-- ============================================================
-- EVV State Aggregator Transmission Layer
--
-- Sends verified visits to a state EVV aggregator (e.g. Minnesota's
-- HHAeXchange open-model aggregator, Sandata) and tracks the result.
-- Built vendor-agnostic: one queue + audit trail, swappable adapters.
--
-- Security posture (gov standard):
--  - No credentials stored here. `credential_ref` names an env/secret key;
--    the secret itself lives in the platform secret store, never the DB.
--  - Transmissions are an append-only audit trail with idempotency keys to
--    guarantee a visit is never double-submitted (double-billing control).
--  - Writes are service-role only; tenants get read-only visibility via RLS.
-- Idempotent: safe to re-run.
-- ============================================================

-- Per-organization aggregator configuration.
CREATE TABLE IF NOT EXISTS evv_aggregator_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  vendor          TEXT NOT NULL DEFAULT 'none'
                    CHECK (vendor IN ('none', 'hhaexchange', 'sandata')),
  provider_id     TEXT,            -- the provider's ID assigned by the aggregator
  api_base        TEXT,            -- aggregator API base URL (from their integration packet)
  credential_ref  TEXT,            -- NAME of the env/secret holding the API key — never the key itself
  enabled         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  CREATE TYPE evv_transmission_status AS ENUM (
    'queued',     -- waiting to send
    'sending',    -- in flight (claimed by a worker)
    'accepted',   -- aggregator accepted the visit
    'rejected',   -- aggregator permanently rejected (bad data) — needs human fix
    'failed'      -- exhausted retries (transient errors) — dead-letter
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS evv_aggregator_transmissions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  visit_id         UUID NOT NULL REFERENCES evv_visits(id) ON DELETE CASCADE,
  vendor           TEXT NOT NULL,
  status           evv_transmission_status NOT NULL DEFAULT 'queued',
  attempts         INTEGER NOT NULL DEFAULT 0,
  max_attempts     INTEGER NOT NULL DEFAULT 5,
  idempotency_key  TEXT NOT NULL,   -- stable per visit: never submit the same visit twice
  external_id      TEXT,            -- aggregator's confirmation/visit id
  last_error       TEXT,
  next_attempt_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_payload  JSONB,
  response_payload JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_evv_tx_org_status
  ON evv_aggregator_transmissions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_evv_tx_due
  ON evv_aggregator_transmissions(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_evv_tx_visit
  ON evv_aggregator_transmissions(visit_id);

-- Denormalized status on the visit for fast dashboards.
ALTER TABLE evv_visits ADD COLUMN IF NOT EXISTS aggregator_status TEXT;
ALTER TABLE evv_visits ADD COLUMN IF NOT EXISTS aggregator_synced_at TIMESTAMPTZ;
ALTER TABLE evv_visits ADD COLUMN IF NOT EXISTS aggregator_external_id TEXT;

-- RLS: tenants read their own; only the service role writes (via the worker).
ALTER TABLE evv_aggregator_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE evv_aggregator_transmissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "evv_agg_config_select_same_org" ON evv_aggregator_config;
CREATE POLICY "evv_agg_config_select_same_org"
  ON evv_aggregator_config FOR SELECT
  USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "evv_agg_config_manage_admin" ON evv_aggregator_config;
CREATE POLICY "evv_agg_config_manage_admin"
  ON evv_aggregator_config FOR ALL
  USING (organization_id = get_my_org_id() AND has_role('org_admin'))
  WITH CHECK (organization_id = get_my_org_id() AND has_role('org_admin'));

DROP POLICY IF EXISTS "evv_tx_select_same_org" ON evv_aggregator_transmissions;
CREATE POLICY "evv_tx_select_same_org"
  ON evv_aggregator_transmissions FOR SELECT
  USING (organization_id = get_my_org_id());

-- Ask PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
