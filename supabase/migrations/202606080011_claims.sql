-- Claims and service authorization tables for billing

CREATE TABLE IF NOT EXISTS claims (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  claim_number    TEXT NOT NULL,
  payer           TEXT NOT NULL,
  auth_number     TEXT,
  cpt_code        TEXT NOT NULL,
  modifier        TEXT,
  rate            NUMERIC(10,2),
  amount          NUMERIC(10,2),
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'paid', 'denied')),
  service_date    DATE NOT NULL,
  submitted_at    TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_org ON claims(organization_id);
CREATE INDEX IF NOT EXISTS idx_claims_client ON claims(client_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);

CREATE TABLE IF NOT EXISTS service_authorizations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  auth_number       TEXT NOT NULL,
  payer             TEXT NOT NULL,
  cpt_code          TEXT NOT NULL,
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  authorized_units  INTEGER NOT NULL DEFAULT 0,
  used_units        INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'exhausted')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_auth_org ON service_authorizations(organization_id, client_id);

INSERT INTO claims (organization_id, client_id, claim_number, payer, cpt_code, status, service_date)
SELECT
  (SELECT id FROM organizations LIMIT 1),
  id,
  'CLM-SEED-' || substr(md5(random()::text), 1, 6),
  'Minnesota DHS',
  'T1019',
  'draft',
  CURRENT_DATE - (random() * 30)::int
FROM clients LIMIT 3
ON CONFLICT DO NOTHING;
