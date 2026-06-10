-- Webhook delivery logs for auditing webhook notifications

CREATE TABLE IF NOT EXISTS webhook_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  webhook_type    TEXT NOT NULL CHECK (webhook_type IN ('slack', 'teams', 'generic')),
  webhook_url     TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  payload         JSONB,
  response_status INTEGER,
  response_body   TEXT,
  success         BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at         TIMESTAMPTZ DEFAULT NOW(),
  error_message   TEXT
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_org ON webhook_logs(organization_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event ON webhook_logs(event_type);
