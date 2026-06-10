-- Refresh Supabase/PostgREST schema cache after adding EVV and audit automation tables.
-- Run this in Supabase SQL Editor if REST writes say a table is missing from schema cache.
NOTIFY pgrst, 'reload schema';
