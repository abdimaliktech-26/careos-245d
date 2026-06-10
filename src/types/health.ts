export type Medication = {
  id: string
  organization_id: string
  client_id: string
  medication_name: string
  dosage: string
  route: string
  frequency: string
  prescribed_by: string | null
  prescribing_physician: string | null
  pharmacy_name: string | null
  pharmacy_phone: string | null
  start_date: string
  end_date: string | null
  is_active: boolean
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type Vital = {
  id: string
  organization_id: string
  client_id: string
  vital_type: string
  value: number
  unit: string | null
  recorded_by: string
  recorded_at: string
  notes: string | null
}

export type HealthCondition = {
  id: string
  organization_id: string
  client_id: string
  condition_name: string
  diagnosis_date: string | null
  is_chronic: boolean
  severity: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type HealthSummary = {
  conditions: HealthCondition[]
  activeMedications: Medication[]
  recentVitals: Vital[]
}

export const VITAL_LABELS: Record<string, string> = {
  blood_pressure_systolic: 'BP Systolic',
  blood_pressure_diastolic: 'BP Diastolic',
  heart_rate: 'Heart Rate',
  temperature: 'Temperature',
  respiratory_rate: 'Respiratory Rate',
  oxygen_saturation: 'O₂ Sat',
  blood_glucose: 'Blood Glucose',
  weight: 'Weight',
  height: 'Height',
  bmi: 'BMI',
  pain_level: 'Pain Level',
  other: 'Other',
}

export const VITAL_UNITS: Record<string, string> = {
  blood_pressure_systolic: 'mmHg',
  blood_pressure_diastolic: 'mmHg',
  heart_rate: 'bpm',
  temperature: '°F',
  respiratory_rate: 'breaths/min',
  oxygen_saturation: '%',
  blood_glucose: 'mg/dL',
  weight: 'lbs',
  height: 'in',
  bmi: 'kg/m²',
  pain_level: '/10',
  other: '',
}

export function getVitalLabel(type: string): string {
  return VITAL_LABELS[type] ?? type.replace(/_/g, ' ')
}

export function getVitalUnit(type: string): string {
  return VITAL_UNITS[type] ?? ''
}
