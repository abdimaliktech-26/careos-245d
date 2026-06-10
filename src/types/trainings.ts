export type TrainingStatus = 'current' | 'expiring_soon' | 'expired' | 'not_completed'

export type StaffTraining = {
  id: string
  organization_id: string
  staff_id: string
  training_name: string
  training_code: string | null
  completed_date: string | null
  expiration_date: string | null
  status: TrainingStatus
  document_id: string | null
  certificate_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
  staff_profiles?: { full_name: string } | null
}
