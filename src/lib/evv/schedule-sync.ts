import type { createClient } from '@/lib/supabase/server'
import type { createAdminClient } from '@/lib/supabase/admin'

type SupabaseWriter = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>

export type ScheduleRow = {
  id: string
  client_id: string
  scheduled_date: string
  start_time: string
  end_time: string
  service_type: string
  status: string
  evv_visit_id?: string | null
}

export type ExistingVisit = {
  client_id: string
  service_date: string
  service_name: string | null
}

const ACTIVE_SCHEDULE_STATUSES = new Set(['scheduled', 'completed'])

function visitKey(clientId: string, date: string, service: string | null): string {
  return `${clientId}|${date}|${(service ?? '').trim().toLowerCase()}`
}

/**
 * Schedules that should produce an EVV visit but don't have one yet.
 * Matched on client + date + service so re-running never double-creates.
 * Pure and side-effect free for testability.
 */
export function findUnsyncedSchedules(
  schedules: ScheduleRow[],
  existingVisits: ExistingVisit[]
): ScheduleRow[] {
  const taken = new Set(existingVisits.map((v) => visitKey(v.client_id, v.service_date, v.service_name)))
  const seen = new Set<string>()

  return schedules.filter((s) => {
    if (s.evv_visit_id) return false
    if (!ACTIVE_SCHEDULE_STATUSES.has(s.status)) return false
    const key = visitKey(s.client_id, s.scheduled_date, s.service_type)
    if (taken.has(key) || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Builds the evv_visits insert payload for a schedule. */
export function scheduleToVisitInsert(organizationId: string, s: ScheduleRow) {
  return {
    organization_id: organizationId,
    client_id: s.client_id,
    service_name: s.service_type,
    service_date: s.scheduled_date,
    scheduled_start: `${s.scheduled_date}T${s.start_time}`,
    scheduled_end: `${s.scheduled_date}T${s.end_time}`,
    status: 'scheduled' as const,
  }
}

/**
 * Creates EVV visits for any schedule in the date range that lacks one, and
 * links each schedule back to the visit it produced. Idempotent.
 */
export async function syncScheduledVisits(
  organizationId: string,
  supabase: SupabaseWriter,
  range: { startDate: string; endDate: string }
): Promise<{ created: number }> {
  const [{ data: schedules }, { data: visits }] = await Promise.all([
    supabase
      .from('schedules')
      .select('id, client_id, scheduled_date, start_time, end_time, service_type, status, evv_visit_id')
      .eq('organization_id', organizationId)
      .gte('scheduled_date', range.startDate)
      .lte('scheduled_date', range.endDate),
    supabase
      .from('evv_visits')
      .select('client_id, service_date, service_name')
      .eq('organization_id', organizationId)
      .gte('service_date', range.startDate)
      .lte('service_date', range.endDate),
  ])

  const unsynced = findUnsyncedSchedules(
    (schedules ?? []) as ScheduleRow[],
    (visits ?? []) as ExistingVisit[]
  )
  if (unsynced.length === 0) return { created: 0 }

  let created = 0
  for (const schedule of unsynced) {
    const { data: inserted, error } = await supabase
      .from('evv_visits')
      .insert(scheduleToVisitInsert(organizationId, schedule))
      .select('id')
      .single()
    if (error || !inserted) continue

    await supabase
      .from('schedules')
      .update({ evv_visit_id: (inserted as { id: string }).id })
      .eq('id', schedule.id)
      .eq('organization_id', organizationId)
    created++
  }

  return { created }
}
