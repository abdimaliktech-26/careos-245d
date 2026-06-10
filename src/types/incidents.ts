export type IncidentCategory = 'injury' | 'medication_error' | 'behavioral_incident' | 'emergency_manual_restraint' | 'maltreatment_concern' | 'death' | 'property_damage' | 'elopement' | 'other'

export type IncidentStatus = 'open' | 'under_review' | 'reported_to_state' | 'closed'

export type Incident = {
  id: string
  organization_id: string
  client_id: string | null
  incident_number: string
  category: IncidentCategory
  status: IncidentStatus
  occurred_at: string
  location: string | null
  description: string
  immediate_actions: string | null
  reported_by: string | null
  staff_involved: string[] | null
  guardian_notified: boolean
  guardian_notified_at: string | null
  case_manager_notified: boolean
  case_manager_notified_at: string | null
  dhs_reported: boolean
  dhs_reported_at: string | null
  dhs_report_number: string | null
  follow_up_required: boolean
  follow_up_notes: string | null
  follow_up_due_date: string | null
  resolved_at: string | null
  resolved_by: string | null
  ai_analysis: unknown
  created_at: string
  updated_at: string
  clients?: { legal_name: string } | null
}
