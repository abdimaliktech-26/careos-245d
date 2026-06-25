export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ORG_ADMIN: 'org_admin',
  PROGRAM_MANAGER: 'program_manager',
  STAFF: 'staff',
  EXTERNAL_SIGNER: 'external_signer',
  PHARMACY_ADMIN: 'pharmacy_admin',
  PHARMACY_STAFF: 'pharmacy_staff',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export type UserProfile = {
  id: string
  organizationId: string | null
  role: Role
  fullName: string
  email: string
  isActive: boolean
  /** Set for pharmacy_admin / pharmacy_staff users (pharmacy-side membership). */
  pharmacyId?: string | null
  impersonating?: { orgId: string; orgName: string; expiresAt: string } | null
  /** Branding for the user's own org, joined in getSession to avoid a second
   *  query in the app layout. Null for users without an org. During super_admin
   *  impersonation the layout re-resolves branding for the impersonated org. */
  branding?: OrgBranding | null
}

export type OrgBranding = {
  name: string
  logo_url: string | null
  brand_primary: string
  brand_accent: string
}

export type Organization = {
  id: string
  name: string
  licenseNumber: string | null
  address: string | null
  city: string | null
  state: string
  zip: string | null
  contactEmail: string
  status: 'pending' | 'active' | 'suspended'
  createdAt: string
  logo_url: string | null
  brand_primary: string
  brand_accent: string
  plan: string | null
  plan_expires_at: string | null
  subscription_price: number | null
}

// ============================================================
// eMAR + PHARMACY PORTAL
// ============================================================

export type MedicationStatus = 'active' | 'discontinued' | 'expired' | 'pending'
export type MedAdminStatus =
  | 'given' | 'refused' | 'held' | 'missed' | 'not_available' | 'late' | 'error'
export type MedTaskStatus = 'pending' | 'completed' | 'missed'
export type MedicationOrderStatus =
  | 'draft' | 'submitted' | 'pending_review' | 'approved' | 'rejected'
  | 'needs_clarification' | 'active' | 'discontinued'
export type RefillStatus =
  | 'requested' | 'received' | 'processing' | 'waiting_physician' | 'filled'
  | 'shipped' | 'delivered' | 'denied' | 'needs_clarification'
export type RefillUrgency = 'routine' | 'urgent' | 'emergency'
export type PharmacyLinkStatus = 'invited' | 'pending' | 'approved' | 'rejected' | 'suspended'
export type PharmacyDocumentCategory =
  | 'prescription_order' | 'physician_order' | 'medication_change'
  | 'discontinuation_order' | 'refill_authorization' | 'delivery_receipt'
  | 'mar_sheet' | 'controlled_substance_log' | 'other'
export type MedAlertType =
  | 'missed_medication' | 'late_medication' | 'missing_physician_order'
  | 'expired_medication' | 'refill_risk' | 'prn_missing_outcome'
  | 'controlled_substance_discrepancy' | 'order_not_reviewed'
  | 'pharmacy_delivery_delay' | 'medication_error_pattern'
export type MedAlertStatus = 'open' | 'acknowledged' | 'resolved'

export type Pharmacy = {
  id: string
  name: string
  npi: string | null
  dea_number: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  phone: string | null
  email: string | null
  contact_name: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Medication = {
  id: string
  organization_id: string
  client_id: string
  name: string
  generic_name: string | null
  dosage: string | null
  route: string | null
  frequency: string | null
  administration_times: string[]
  start_date: string | null
  end_date: string | null
  prescribing_physician: string | null
  pharmacy_id: string | null
  is_prn: boolean
  is_controlled: boolean
  special_instructions: string | null
  status: MedicationStatus
  physician_order_document_id: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export type MedicationAdministrationRecord = {
  id: string
  organization_id: string
  client_id: string
  medication_id: string
  schedule_id: string | null
  task_id: string | null
  status: MedAdminStatus
  scheduled_for: string | null
  administered_at: string
  staff_id: string | null
  signature: string | null
  notes: string | null
  reason: string | null
  prn_reason: string | null
  prn_outcome: string | null
  pain_before: number | null
  pain_after: number | null
  created_at: string
}

export type MedicationPassTask = {
  id: string
  organization_id: string
  client_id: string
  medication_id: string
  schedule_id: string | null
  due_at: string
  status: MedTaskStatus
  record_id: string | null
}

export type MedicationOrder = {
  id: string
  organization_id: string
  pharmacy_id: string | null
  client_id: string
  medication_id: string | null
  status: MedicationOrderStatus
  payload: Record<string, unknown>
  notes: string | null
  clarification_note: string | null
  submitted_at: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export type RefillRequest = {
  id: string
  organization_id: string
  client_id: string
  medication_id: string
  pharmacy_id: string | null
  quantity_remaining: number | null
  days_remaining: number | null
  urgency: RefillUrgency
  notes: string | null
  status: RefillStatus
  pharmacy_response: string | null
  requested_at: string
  responded_at: string | null
}

export type MedicationComplianceAlert = {
  id: string
  organization_id: string
  client_id: string | null
  medication_id: string | null
  staff_id: string | null
  pharmacy_id: string | null
  alert_type: MedAlertType
  severity: string
  status: MedAlertStatus
  title: string
  detail: string | null
  metadata: Record<string, unknown>
  detected_at: string
  resolved_at: string | null
}
