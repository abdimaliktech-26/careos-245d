-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- TENANTS
-- ─────────────────────────────────────────────
CREATE TABLE public.tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  license_number TEXT,
  address       TEXT,
  city          TEXT,
  state         TEXT NOT NULL DEFAULT 'MN',
  zip           TEXT,
  contact_email TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'active', 'suspended')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- USERS (extends auth.users)
-- ─────────────────────────────────────────────
CREATE TABLE public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  role        TEXT NOT NULL
                CHECK (role IN ('super_admin', 'admin', 'staff', 'client')),
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tenant_required_unless_super_admin
    CHECK (role = 'super_admin' OR tenant_id IS NOT NULL)
);

-- ─────────────────────────────────────────────
-- PROGRAMS
-- ─────────────────────────────────────────────
CREATE TABLE public.programs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  code        TEXT NOT NULL UNIQUE
                CHECK (code IN ('ihs', 'residential', 'employment', 'emergency')),
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- ─────────────────────────────────────────────
-- CLIENTS (PHI — staff-only access via RLS)
-- ─────────────────────────────────────────────
CREATE TABLE public.clients (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  assigned_staff_id    UUID REFERENCES public.users(id),
  program_id           UUID REFERENCES public.programs(id),
  first_name           TEXT NOT NULL,
  last_name            TEXT NOT NULL,
  date_of_birth        DATE,
  phone                TEXT,
  email                TEXT,
  address              TEXT,
  city                 TEXT,
  state                TEXT DEFAULT 'MN',
  zip                  TEXT,
  guardian_name        TEXT,
  guardian_phone       TEXT,
  guardian_email       TEXT,
  guardian_relationship TEXT,
  intake_date          DATE,
  status               TEXT NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'inactive', 'discharged')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- FORM DEFINITIONS (schema for each of the 44 forms)
-- ─────────────────────────────────────────────
CREATE TABLE public.form_definitions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_code   TEXT NOT NULL UNIQUE,
  form_name   TEXT NOT NULL,
  form_set    TEXT NOT NULL
                CHECK (form_set IN ('intake', '45day', 'semiannual', 'annual')),
  sort_order  INTEGER NOT NULL,
  schema      JSONB NOT NULL DEFAULT '{}',
  version     INTEGER NOT NULL DEFAULT 1,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- FORM ASSIGNMENTS (tracks due dates per client)
-- ─────────────────────────────────────────────
CREATE TABLE public.form_assignments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id           UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  form_definition_id  UUID NOT NULL REFERENCES public.form_definitions(id),
  form_set            TEXT NOT NULL,
  due_date            DATE NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- FORM SUBMISSIONS
-- ─────────────────────────────────────────────
CREATE TABLE public.form_submissions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id          UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  form_assignment_id UUID NOT NULL REFERENCES public.form_assignments(id),
  form_definition_id UUID NOT NULL REFERENCES public.form_definitions(id),
  staff_id           UUID NOT NULL REFERENCES public.users(id),
  form_data          JSONB NOT NULL DEFAULT '{}',
  status             TEXT NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft', 'pending_signatures', 'complete')),
  pdf_path           TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- SIGNATURES
-- ─────────────────────────────────────────────
CREATE TABLE public.signatures (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  form_submission_id  UUID NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  signer_type         TEXT NOT NULL
                        CHECK (signer_type IN ('staff', 'client', 'guardian', 'case_manager')),
  signer_name         TEXT NOT NULL,
  signer_user_id      UUID REFERENCES public.users(id),
  signature_data      TEXT NOT NULL,
  ip_address          INET,
  signed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- DOCUMENTS
-- ─────────────────────────────────────────────
CREATE TABLE public.documents (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id          UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  form_submission_id UUID REFERENCES public.form_submissions(id),
  document_type      TEXT NOT NULL CHECK (document_type IN ('form', 'upload')),
  storage_path       TEXT NOT NULL,
  file_name          TEXT NOT NULL,
  file_size          INTEGER,
  mime_type          TEXT,
  is_deleted         BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at         TIMESTAMPTZ,
  created_by         UUID NOT NULL REFERENCES public.users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- AUDIT LOGS (append-only, never delete)
-- ─────────────────────────────────────────────
CREATE TABLE public.audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES public.tenants(id),
  actor_id      UUID REFERENCES public.users(id),
  actor_role    TEXT NOT NULL,
  action        TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id   UUID,
  metadata      JSONB,
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- SUBSCRIPTIONS
-- ─────────────────────────────────────────────
CREATE TABLE public.subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id     TEXT,
  tier                   TEXT NOT NULL DEFAULT 'starter'
                           CHECK (tier IN ('starter', 'professional', 'enterprise')),
  status                 TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'active', 'past_due', 'canceled')),
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- UPDATED_AT trigger function
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_form_assignments_updated_at
  BEFORE UPDATE ON public.form_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_form_submissions_updated_at
  BEFORE UPDATE ON public.form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
