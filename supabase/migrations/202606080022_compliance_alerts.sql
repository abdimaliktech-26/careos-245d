CREATE TABLE IF NOT EXISTS compliance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  title TEXT NOT NULL,
  description TEXT,
  related_packet_id UUID REFERENCES packets(id) ON DELETE CASCADE,
  related_packet_form_id UUID REFERENCES packet_forms(id) ON DELETE CASCADE,
  due_date DATE,
  days_until_due INTEGER,
  is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compliance_alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  deadline_warning_days INTEGER NOT NULL DEFAULT 14,
  remind_interval_hours INTEGER NOT NULL DEFAULT 24,
  critical_webhook_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  warning_webhook_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_alerts_org ON compliance_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_severity ON compliance_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_dismissed ON compliance_alerts(is_dismissed);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_type ON compliance_alerts(type);
