-- Goals for person-centered planning (245D compliance)
-- Tracks client service goals across 45-day/semi-annual/annual reviews

CREATE TYPE goal_status AS ENUM ('active', 'in_progress', 'achieved', 'discontinued', 'revised');
CREATE TYPE goal_category AS ENUM ('clinical', 'behavioral', 'developmental', 'social', 'communication', 'daily_living', 'employment', 'education', 'health', 'other');

CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category goal_category NOT NULL DEFAULT 'other',
  status goal_status NOT NULL DEFAULT 'active',
  target_date DATE,
  start_date DATE DEFAULT CURRENT_DATE,
  achieved_date DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE goal_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  packet_form_id UUID REFERENCES packet_forms(id) ON DELETE SET NULL,
  progress_note TEXT NOT NULL,
  progress_score SMALLINT CHECK (progress_score >= 0 AND progress_score <= 100),
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_goals_org ON goals(organization_id);
CREATE INDEX idx_goals_client ON goals(client_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goal_progress_goal ON goal_progress(goal_id);
