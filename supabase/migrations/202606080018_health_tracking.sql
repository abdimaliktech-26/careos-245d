-- Health tracking for clients

CREATE TYPE medication_route AS ENUM ('oral', 'topical', 'injection', 'inhalation', 'sublingual', 'rectal', 'ophthalmic', 'otic', 'other');
CREATE TYPE medication_frequency AS ENUM ('once_daily', 'twice_daily', 'three_times_daily', 'four_times_daily', 'every_4_hours', 'every_6_hours', 'every_8_hours', 'every_12_hours', 'weekly', 'monthly', 'as_needed', 'other');
CREATE TYPE vital_type AS ENUM ('blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate', 'temperature', 'respiratory_rate', 'oxygen_saturation', 'blood_glucose', 'weight', 'height', 'bmi', 'pain_level', 'other');

CREATE TABLE client_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  route medication_route NOT NULL DEFAULT 'oral',
  frequency medication_frequency NOT NULL DEFAULT 'once_daily',
  prescribed_by TEXT,
  prescribing_physician TEXT,
  pharmacy_name TEXT,
  pharmacy_phone TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE health_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  vital_type vital_type NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT,
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE TABLE health_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  condition_name TEXT NOT NULL,
  diagnosis_date DATE,
  is_chronic BOOLEAN NOT NULL DEFAULT FALSE,
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meds_client ON client_medications(client_id);
CREATE INDEX idx_meds_active ON client_medications(is_active);
CREATE INDEX idx_vitals_client ON health_vitals(client_id);
CREATE INDEX idx_vitals_type ON health_vitals(vital_type);
CREATE INDEX idx_vitals_date ON health_vitals(recorded_at);
CREATE INDEX idx_conditions_client ON health_conditions(client_id);

CREATE TRIGGER trg_client_medications_updated_at
  BEFORE UPDATE ON client_medications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_health_conditions_updated_at
  BEFORE UPDATE ON health_conditions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
