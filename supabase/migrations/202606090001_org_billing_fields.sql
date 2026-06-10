ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ein TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS npi TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS medicaid_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS medicare_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Chicago';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_hourly_rate NUMERIC(10,2);
