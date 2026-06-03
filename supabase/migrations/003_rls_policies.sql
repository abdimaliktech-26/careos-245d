-- ─────────────────────────────────────────────
-- ENABLE RLS ON ALL TABLES
-- ─────────────────────────────────────────────
ALTER TABLE public.tenants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions    ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- TENANTS
-- ─────────────────────────────────────────────
CREATE POLICY "tenants_super_admin_all" ON public.tenants
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'super_admin');

CREATE POLICY "tenants_member_read_own" ON public.tenants
  FOR SELECT TO authenticated
  USING (id = public.current_tenant_id());

-- ─────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────
CREATE POLICY "users_super_admin_all" ON public.users
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'super_admin');

-- Admin can read/create staff in their tenant
CREATE POLICY "users_admin_read_create_staff" ON public.users
  FOR SELECT, INSERT TO authenticated
  USING (
    public.current_user_role() = 'admin'
    AND tenant_id = public.current_tenant_id()
    AND role = 'staff'
  );

-- Admin can update staff in their tenant (WITH CHECK prevents role escalation)
CREATE POLICY "users_admin_update_staff" ON public.users
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'admin'
    AND tenant_id = public.current_tenant_id()
    AND role = 'staff'
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND role = 'staff'
  );

-- Admin can read client user records in their tenant
CREATE POLICY "users_admin_read_clients" ON public.users
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'admin'
    AND tenant_id = public.current_tenant_id()
    AND role = 'client'
  );

-- Staff can read themselves and clients assigned to them
CREATE POLICY "users_staff_read_self_and_clients" ON public.users
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (
      public.current_user_role() = 'staff'
      AND tenant_id = public.current_tenant_id()
      AND role = 'client'
    )
  );

-- Clients can read themselves only
CREATE POLICY "users_client_self" ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- ─────────────────────────────────────────────
-- PROGRAMS (read-only for all authenticated users)
-- ─────────────────────────────────────────────
CREATE POLICY "programs_read_all" ON public.programs
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY "programs_super_admin_write" ON public.programs
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'super_admin');

-- ─────────────────────────────────────────────
-- CLIENTS (PHI — admin and super_admin have NO access)
-- ─────────────────────────────────────────────
CREATE POLICY "clients_staff_own_tenant" ON public.clients
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'staff'
    AND tenant_id = public.current_tenant_id()
    AND assigned_staff_id = auth.uid()
  );

CREATE POLICY "clients_self_read" ON public.clients
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'client'
    AND id = auth.uid()
  );

-- ─────────────────────────────────────────────
-- FORM DEFINITIONS (read-only for all authenticated)
-- ─────────────────────────────────────────────
CREATE POLICY "form_definitions_read_all" ON public.form_definitions
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY "form_definitions_super_admin_write" ON public.form_definitions
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'super_admin');

-- ─────────────────────────────────────────────
-- FORM ASSIGNMENTS (staff only — their assigned clients)
-- ─────────────────────────────────────────────
CREATE POLICY "form_assignments_staff_own_clients" ON public.form_assignments
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'staff'
    AND tenant_id = public.current_tenant_id()
    AND public.staff_owns_client(client_id)
  );

-- ─────────────────────────────────────────────
-- FORM SUBMISSIONS (staff read/write; client read own)
-- ─────────────────────────────────────────────
CREATE POLICY "form_submissions_staff" ON public.form_submissions
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'staff'
    AND tenant_id = public.current_tenant_id()
    AND public.staff_owns_client(client_id)
  );

CREATE POLICY "form_submissions_client_read_own" ON public.form_submissions
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'client'
    AND tenant_id = public.current_tenant_id()
    AND client_id = auth.uid()
  );

-- ─────────────────────────────────────────────
-- SIGNATURES (staff all; client insert own)
-- ─────────────────────────────────────────────
CREATE POLICY "signatures_staff" ON public.signatures
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'staff'
    AND tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.form_submissions fs
      WHERE fs.id = form_submission_id
        AND public.staff_owns_client(fs.client_id)
    )
  );

CREATE POLICY "signatures_client_insert_own" ON public.signatures
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'client'
    AND signer_user_id = auth.uid()
  );

-- ─────────────────────────────────────────────
-- DOCUMENTS (staff CRUD; client read own)
-- ─────────────────────────────────────────────
CREATE POLICY "documents_staff" ON public.documents
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'staff'
    AND tenant_id = public.current_tenant_id()
    AND public.staff_owns_client(client_id)
  );

CREATE POLICY "documents_client_read_own" ON public.documents
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'client'
    AND tenant_id = public.current_tenant_id()
    AND client_id = auth.uid()
    AND is_deleted = FALSE
  );

-- ─────────────────────────────────────────────
-- AUDIT LOGS (super_admin read only; insert via service role)
-- ─────────────────────────────────────────────
CREATE POLICY "audit_logs_super_admin_read" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.current_user_role() = 'super_admin');

CREATE POLICY "audit_logs_no_authenticated_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (FALSE);

-- ─────────────────────────────────────────────
-- SUBSCRIPTIONS (super_admin all; admin read own)
-- ─────────────────────────────────────────────
CREATE POLICY "subscriptions_super_admin_all" ON public.subscriptions
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'super_admin');

CREATE POLICY "subscriptions_admin_read_own" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'admin'
    AND tenant_id = public.current_tenant_id()
  );
