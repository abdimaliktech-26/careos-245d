-- Portal messaging for client/family communication

CREATE TABLE IF NOT EXISTS portal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id),
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  message TEXT NOT NULL,
  is_from_staff BOOLEAN NOT NULL DEFAULT TRUE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_msgs_client ON portal_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_portal_msgs_read ON portal_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_portal_msgs_org ON portal_messages(organization_id);

ALTER TABLE portal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY portal_msgs_org_isolation ON portal_messages
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));
