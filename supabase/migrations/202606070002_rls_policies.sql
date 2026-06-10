-- ============================================================
-- Stillwater 245D Suite — Row Level Security Policies
-- ============================================================
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE organizations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contacts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_templates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fields             ENABLE ROW LEVEL SECURITY;
ALTER TABLE packets                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE packet_forms            ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures              ENABLE ROW LEVEL SECURITY;
ALTER TABLE signing_links           ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents               ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_trainings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents               ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs              ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

-- Members can view their own organization
CREATE POLICY "org_select_own"
  ON organizations FOR SELECT
  USING (id = get_my_org_id());

-- Only super admins can insert new organizations
CREATE POLICY "org_insert_super_admin"
  ON organizations FOR INSERT
  WITH CHECK (is_super_admin());

-- Org admins and super admins can update their org
CREATE POLICY "org_update_admin"
  ON organizations FOR UPDATE
  USING (id = get_my_org_id() AND has_role('org_admin'));

-- Only super admins can delete organizations
CREATE POLICY "org_delete_super_admin"
  ON organizations FOR DELETE
  USING (is_super_admin());

-- ============================================================
-- ORGANIZATION MEMBERS
-- ============================================================

-- Members can see all members in their org
CREATE POLICY "members_select_same_org"
  ON organization_members FOR SELECT
  USING (organization_id = get_my_org_id());

-- Users can always see their own membership record
CREATE POLICY "members_select_own"
  ON organization_members FOR SELECT
  USING (user_id = auth.uid());

-- Org admins can insert new members (via invite flow)
CREATE POLICY "members_insert_admin"
  ON organization_members FOR INSERT
  WITH CHECK (
    organization_id = get_my_org_id()
    AND has_role('org_admin')
  );

-- Super admin can insert members to any org
CREATE POLICY "members_insert_super_admin"
  ON organization_members FOR INSERT
  WITH CHECK (is_super_admin());

-- Org admins can update member roles in their org
CREATE POLICY "members_update_admin"
  ON organization_members FOR UPDATE
  USING (
    organization_id = get_my_org_id()
    AND has_role('org_admin')
  );

-- Users can update their own profile fields (not role)
CREATE POLICY "members_update_own_profile"
  ON organization_members FOR UPDATE
  USING (user_id = auth.uid());

-- Org admins can deactivate members
CREATE POLICY "members_delete_admin"
  ON organization_members FOR DELETE
  USING (
    organization_id = get_my_org_id()
    AND has_role('org_admin')
  );

-- ============================================================
-- INVITES
-- ============================================================

CREATE POLICY "invites_select_admin"
  ON invites FOR SELECT
  USING (organization_id = get_my_org_id() AND has_role('org_admin'));

CREATE POLICY "invites_insert_admin"
  ON invites FOR INSERT
  WITH CHECK (organization_id = get_my_org_id() AND has_role('org_admin'));

CREATE POLICY "invites_update_admin"
  ON invites FOR UPDATE
  USING (organization_id = get_my_org_id() AND has_role('org_admin'));

CREATE POLICY "invites_delete_admin"
  ON invites FOR DELETE
  USING (organization_id = get_my_org_id() AND has_role('org_admin'));

-- Public read for invite acceptance (token-based, no auth required)
-- NOTE: Accept-invite Edge Function runs with service_role key, bypasses RLS

-- ============================================================
-- CLIENTS
-- ============================================================

CREATE POLICY "clients_select_same_org"
  ON clients FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "clients_insert_staff"
  ON clients FOR INSERT
  WITH CHECK (
    organization_id = get_my_org_id()
    AND has_role('staff')
  );

CREATE POLICY "clients_update_staff"
  ON clients FOR UPDATE
  USING (
    organization_id = get_my_org_id()
    AND has_role('staff')
  );

-- Only org admins and above can delete clients (soft delete preferred)
CREATE POLICY "clients_delete_admin"
  ON clients FOR DELETE
  USING (
    organization_id = get_my_org_id()
    AND has_role('org_admin')
  );

-- ============================================================
-- CLIENT CONTACTS
-- ============================================================

CREATE POLICY "contacts_select_same_org"
  ON client_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = client_contacts.client_id
        AND c.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "contacts_insert_staff"
  ON client_contacts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = client_contacts.client_id
        AND c.organization_id = get_my_org_id()
    )
    AND has_role('staff')
  );

CREATE POLICY "contacts_update_staff"
  ON client_contacts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = client_contacts.client_id
        AND c.organization_id = get_my_org_id()
    )
    AND has_role('staff')
  );

CREATE POLICY "contacts_delete_staff"
  ON client_contacts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = client_contacts.client_id
        AND c.organization_id = get_my_org_id()
    )
    AND has_role('staff')
  );

-- ============================================================
-- FORM TEMPLATES
-- ============================================================

-- All authenticated users can read system templates
-- Org-specific templates visible only to their org
CREATE POLICY "templates_select"
  ON form_templates FOR SELECT
  USING (
    is_system = TRUE
    OR organization_id = get_my_org_id()
  );

-- Only org admins can create custom templates
CREATE POLICY "templates_insert_admin"
  ON form_templates FOR INSERT
  WITH CHECK (
    is_system = FALSE
    AND organization_id = get_my_org_id()
    AND has_role('org_admin')
  );

CREATE POLICY "templates_update_admin"
  ON form_templates FOR UPDATE
  USING (
    is_system = FALSE
    AND organization_id = get_my_org_id()
    AND has_role('org_admin')
  );

-- ============================================================
-- FORM FIELDS
-- ============================================================

CREATE POLICY "fields_select"
  ON form_fields FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM form_templates ft
      WHERE ft.id = form_fields.template_id
        AND (ft.is_system = TRUE OR ft.organization_id = get_my_org_id())
    )
  );

CREATE POLICY "fields_insert_admin"
  ON form_fields FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM form_templates ft
      WHERE ft.id = form_fields.template_id
        AND ft.is_system = FALSE
        AND ft.organization_id = get_my_org_id()
    )
    AND has_role('org_admin')
  );

-- ============================================================
-- PACKETS
-- ============================================================

CREATE POLICY "packets_select_same_org"
  ON packets FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "packets_insert_staff"
  ON packets FOR INSERT
  WITH CHECK (
    organization_id = get_my_org_id()
    AND has_role('staff')
  );

CREATE POLICY "packets_update_staff"
  ON packets FOR UPDATE
  USING (
    organization_id = get_my_org_id()
    AND has_role('staff')
  );

CREATE POLICY "packets_delete_admin"
  ON packets FOR DELETE
  USING (
    organization_id = get_my_org_id()
    AND has_role('org_admin')
  );

-- ============================================================
-- PACKET FORMS
-- ============================================================

CREATE POLICY "packet_forms_select"
  ON packet_forms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM packets p
      WHERE p.id = packet_forms.packet_id
        AND p.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "packet_forms_insert_staff"
  ON packet_forms FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM packets p
      WHERE p.id = packet_forms.packet_id
        AND p.organization_id = get_my_org_id()
    )
    AND has_role('staff')
  );

CREATE POLICY "packet_forms_update_staff"
  ON packet_forms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM packets p
      WHERE p.id = packet_forms.packet_id
        AND p.organization_id = get_my_org_id()
    )
    AND has_role('staff')
  );

-- ============================================================
-- FORM RESPONSES
-- ============================================================

CREATE POLICY "responses_select"
  ON form_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM packet_forms pf
      JOIN packets p ON p.id = pf.packet_id
      WHERE pf.id = form_responses.packet_form_id
        AND p.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "responses_insert_staff"
  ON form_responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM packet_forms pf
      JOIN packets p ON p.id = pf.packet_id
      WHERE pf.id = form_responses.packet_form_id
        AND p.organization_id = get_my_org_id()
    )
    AND has_role('staff')
  );

CREATE POLICY "responses_update_staff"
  ON form_responses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM packet_forms pf
      JOIN packets p ON p.id = pf.packet_id
      WHERE pf.id = form_responses.packet_form_id
        AND p.organization_id = get_my_org_id()
        -- Cannot update after form is submitted
        AND pf.submitted_at IS NULL
    )
    AND has_role('staff')
  );

-- ============================================================
-- SIGNATURES
-- ============================================================

CREATE POLICY "signatures_select"
  ON signatures FOR SELECT
  USING (organization_id = get_my_org_id());

-- Staff can insert signatures (for themselves)
CREATE POLICY "signatures_insert_staff"
  ON signatures FOR INSERT
  WITH CHECK (
    organization_id = get_my_org_id()
    AND has_role('staff')
  );

-- Signatures are immutable — no updates or deletes
-- (correction = new signature with note)

-- ============================================================
-- SIGNING LINKS
-- ============================================================

CREATE POLICY "signing_links_select_staff"
  ON signing_links FOR SELECT
  USING (organization_id = get_my_org_id() AND has_role('staff'));

CREATE POLICY "signing_links_insert_staff"
  ON signing_links FOR INSERT
  WITH CHECK (organization_id = get_my_org_id() AND has_role('staff'));

CREATE POLICY "signing_links_update_staff"
  ON signing_links FOR UPDATE
  USING (organization_id = get_my_org_id() AND has_role('staff'));

-- Public token-based access for external signers is handled
-- via a service-role Edge Function that validates the token,
-- checks expiry, and returns only the specific form data.

-- ============================================================
-- DOCUMENTS
-- ============================================================

CREATE POLICY "documents_select_same_org"
  ON documents FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "documents_insert_staff"
  ON documents FOR INSERT
  WITH CHECK (
    organization_id = get_my_org_id()
    AND has_role('staff')
  );

-- Only admins can delete documents
CREATE POLICY "documents_delete_admin"
  ON documents FOR DELETE
  USING (
    organization_id = get_my_org_id()
    AND has_role('org_admin')
  );

-- ============================================================
-- STAFF PROFILES
-- ============================================================

CREATE POLICY "staff_select_same_org"
  ON staff_profiles FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "staff_insert_admin"
  ON staff_profiles FOR INSERT
  WITH CHECK (
    organization_id = get_my_org_id()
    AND has_role('org_admin')
  );

CREATE POLICY "staff_update_admin"
  ON staff_profiles FOR UPDATE
  USING (
    organization_id = get_my_org_id()
    AND has_role('org_admin')
  );

-- Staff can update their own profile
CREATE POLICY "staff_update_own"
  ON staff_profiles FOR UPDATE
  USING (
    organization_id = get_my_org_id()
    AND user_id = auth.uid()
  );

-- ============================================================
-- STAFF TRAININGS
-- ============================================================

CREATE POLICY "trainings_select_same_org"
  ON staff_trainings FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "trainings_insert_admin"
  ON staff_trainings FOR INSERT
  WITH CHECK (
    organization_id = get_my_org_id()
    AND has_role('program_manager')
  );

CREATE POLICY "trainings_update_admin"
  ON staff_trainings FOR UPDATE
  USING (
    organization_id = get_my_org_id()
    AND has_role('program_manager')
  );

-- ============================================================
-- INCIDENTS
-- ============================================================

CREATE POLICY "incidents_select_same_org"
  ON incidents FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "incidents_insert_staff"
  ON incidents FOR INSERT
  WITH CHECK (
    organization_id = get_my_org_id()
    AND has_role('staff')
  );

CREATE POLICY "incidents_update_staff"
  ON incidents FOR UPDATE
  USING (
    organization_id = get_my_org_id()
    AND has_role('staff')
  );

-- Only admins can delete incident records
CREATE POLICY "incidents_delete_admin"
  ON incidents FOR DELETE
  USING (
    organization_id = get_my_org_id()
    AND has_role('org_admin')
  );

-- ============================================================
-- AUDIT LOGS
-- ============================================================

-- Read: org admins and above can view their org's logs
CREATE POLICY "audit_select_admin"
  ON audit_logs FOR SELECT
  USING (
    organization_id = get_my_org_id()
    AND has_role('org_admin')
  );

-- Anyone in the org can insert audit logs (append-only)
CREATE POLICY "audit_insert_all"
  ON audit_logs FOR INSERT
  WITH CHECK (
    organization_id = get_my_org_id()
    OR is_super_admin()
  );

-- NO UPDATE policy — audit logs are immutable
-- NO DELETE policy — audit logs are immutable
