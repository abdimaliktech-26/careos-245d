ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_primary TEXT DEFAULT '#4361EE';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_accent TEXT DEFAULT '#7B61FF';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_price NUMERIC(10,2);

UPDATE organizations SET brand_primary = '#4361EE' WHERE brand_primary IS NULL;
UPDATE organizations SET brand_accent = '#7B61FF' WHERE brand_accent IS NULL;
