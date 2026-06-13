export type ClientSummary = {
  id: string
  legal_name: string
  preferred_name: string | null
  intake_date: string | null
  status: 'active' | 'inactive' | 'discharged' | 'on_hold'
  program: string
}

export type ClientDetail = {
  id: string
  organization_id: string
  assigned_staff_id: string | null
  program: string
  legal_name: string
  preferred_name: string | null
  date_of_birth: string | null
  phone: string | null
  email: string | null
  home_address: string | null
  city: string | null
  state: string
  zip: string | null
  guardian_name: string | null
  guardian_phone: string | null
  guardian_email: string | null
  guardian_relationship: string | null
  intake_date: string | null
  status: 'active' | 'inactive' | 'discharged' | 'on_hold'
  created_at: string
  updated_at: string
}

export type FormSetStatus = {
  formSet: 'intake' | '45_day_review' | 'semi_annual_review' | 'annual_review'
  label: string
  total: number
  completed: number
  overdue: number
  dueDate: string | null
  firstPendingAssignmentId: string | null
}

export type StaffSummary = {
  id: string
  full_name: string
  email: string
  phone: string | null
  is_active: boolean
  created_at: string
  caregiver_id: string | null
}
