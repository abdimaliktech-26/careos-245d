export type PortalMessage = {
  id: string
  organization_id: string
  client_id: string
  sender_id: string | null
  sender_name: string
  sender_role: string
  message: string
  is_from_staff: boolean
  is_read: boolean
  created_at: string
}

export type ServiceLogNote = {
  id: string
  visit_date: string
  start_time: string
  end_time: string
  service_type: string
  mood_rating: number | null
  narrative: string
  staff_name: string
  created_at: string
}

export type EvvLogEntry = {
  id: string
  service_date: string
  scheduled_start: string | null
  scheduled_end: string | null
  actual_start: string | null
  actual_end: string | null
  service_name: string | null
  status: string
  check_in_method: string | null
  check_out_method: string | null
  notes: string | null
}

export type ScheduleEntry = {
  id: string
  scheduled_date: string
  start_time: string
  end_time: string
  service_type: string
  status: string
  staff_name: string | null
  notes: string | null
}
