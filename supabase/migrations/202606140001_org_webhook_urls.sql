-- ============================================================
-- Add Slack/Teams webhook URL columns to organizations
-- ============================================================
-- These columns are referenced by admin settings, the webhooks API,
-- compliance alerts, notification broadcast, and the audit assistant,
-- but were never created by an earlier migration.
-- ============================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS teams_webhook_url TEXT;
