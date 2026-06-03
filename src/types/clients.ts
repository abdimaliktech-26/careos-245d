export type ClientSummary = {
  id: string
  first_name: string
  last_name: string
  intake_date: string | null
  status: 'active' | 'inactive' | 'discharged'
  program_id: string | null
  programs: { name: string; code: string } | null
}

export type ClientDetail = {
  id: string
  tenant_id: string
  assigned_staff_id: string | null
  program_id: string | null
  first_name: string
  last_name: string
  date_of_birth: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string
  zip: string | null
  guardian_name: string | null
  guardian_phone: string | null
  guardian_email: string | null
  guardian_relationship: string | null
  intake_date: string | null
  status: 'active' | 'inactive' | 'discharged'
  created_at: string
  updated_at: string
  programs: { id: string; name: string; code: string } | null
}

export type FormSetStatus = {
  formSet: 'intake' | '45day' | 'semiannual' | 'annual'
  label: string
  total: number
  completed: number
  overdue: number
  dueDate: string | null
}

export type StaffSummary = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  is_active: boolean
  created_at: string
}
