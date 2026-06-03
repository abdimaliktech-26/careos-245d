-- Indexes for common query patterns

-- clients: look up by tenant + staff assignment
CREATE INDEX idx_clients_tenant_id ON public.clients(tenant_id);
CREATE INDEX idx_clients_assigned_staff ON public.clients(assigned_staff_id);
CREATE INDEX idx_clients_tenant_staff ON public.clients(tenant_id, assigned_staff_id);

-- form_assignments: due date lookups and status checks
CREATE INDEX idx_form_assignments_client ON public.form_assignments(client_id);
CREATE INDEX idx_form_assignments_tenant ON public.form_assignments(tenant_id);
CREATE INDEX idx_form_assignments_due_date ON public.form_assignments(due_date);
CREATE INDEX idx_form_assignments_status ON public.form_assignments(status);

-- form_submissions: staff workload queries
CREATE INDEX idx_form_submissions_client ON public.form_submissions(client_id);
CREATE INDEX idx_form_submissions_staff ON public.form_submissions(staff_id);
CREATE INDEX idx_form_submissions_tenant ON public.form_submissions(tenant_id);

-- documents: client document lookups
CREATE INDEX idx_documents_client ON public.documents(client_id);
CREATE INDEX idx_documents_tenant ON public.documents(tenant_id);
CREATE INDEX idx_documents_not_deleted ON public.documents(client_id) WHERE is_deleted = FALSE;

-- audit_logs: recent activity queries
CREATE INDEX idx_audit_logs_tenant ON public.audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- users: role-based lookups
CREATE INDEX idx_users_tenant_role ON public.users(tenant_id, role);
