-- T-Log (shift notes) and Schedule tables

CREATE TABLE IF NOT EXISTS public.shift_notes (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  staff_id         UUID NOT NULL REFERENCES auth.users(id),
  staff_name       TEXT NOT NULL,
  visit_date       DATE NOT NULL,
  start_time       TIME NOT NULL,
  end_time         TIME NOT NULL,
  service_type     TEXT NOT NULL,
  mood_rating      INTEGER CHECK (mood_rating BETWEEN 1 AND 5),
  narrative        TEXT NOT NULL,
  goals_addressed  TEXT,
  activities       TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shift_notes_org_date_idx ON public.shift_notes (organization_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS shift_notes_client_idx   ON public.shift_notes (client_id);

CREATE TABLE IF NOT EXISTS public.schedules (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  staff_id         UUID REFERENCES auth.users(id),
  staff_name       TEXT,
  scheduled_date   DATE NOT NULL,
  start_time       TIME NOT NULL,
  end_time         TIME NOT NULL,
  service_type     TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'scheduled'
                     CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS schedules_org_date_idx ON public.schedules (organization_id, scheduled_date);
CREATE INDEX IF NOT EXISTS schedules_client_idx   ON public.schedules (client_id);

-- RLS
ALTER TABLE public.shift_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules    ENABLE ROW LEVEL SECURITY;

CREATE POLICY shift_notes_org_isolation ON public.shift_notes
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY schedules_org_isolation ON public.schedules
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- updated_at triggers
CREATE TRIGGER shift_notes_updated_at
  BEFORE UPDATE ON public.shift_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER schedules_updated_at
  BEFORE UPDATE ON public.schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
