-- Add status tracking for organization lifecycle management
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('pending', 'active', 'suspended'));

-- Update existing orgs to active if they have a plan set
UPDATE organizations SET status = 'active' WHERE status = 'pending' AND plan IS NOT NULL AND plan != 'trial';
