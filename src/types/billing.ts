export type ClaimStatus = 'draft' | 'submitted' | 'paid' | 'denied'

export type Claim = {
  id: string
  organization_id: string
  client_id: string
  claim_number: string
  payer: string
  auth_number: string | null
  auth_start: string | null
  auth_end: string | null
  auth_units: number | null
  used_units: number | null
  cpt_code: string
  modifier: string | null
  rate: number | null
  amount: number | null
  status: ClaimStatus
  service_date: string
  submitted_at: string | null
  paid_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  clients?: { legal_name: string } | null
}

export type ServiceAuthorization = {
  id: string
  organization_id: string
  client_id: string
  auth_number: string
  payer: string
  cpt_code: string
  start_date: string
  end_date: string
  authorized_units: number
  used_units: number
  status: 'active' | 'expired' | 'exhausted'
}

export type CptCode = {
  code: string
  description: string
  default_rate: number | null
}
