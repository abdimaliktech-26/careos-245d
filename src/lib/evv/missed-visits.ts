import type { createClient } from '@/lib/supabase/server'
import type { createAdminClient } from '@/lib/supabase/admin'
import { MISSED_VISIT_GRACE_MINUTES } from './compliance'

type SupabaseWriter = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>

const MS_PER_MINUTE = 60000

/**
 * Persists `status = 'missed'` for scheduled visits whose window has fully
 * elapsed (plus a grace period) with no check-in. Run nightly so the metric
 * survives across sessions and feeds the compliance-alert pipeline.
 *
 * Returns the visit ids that were newly flagged. Best-effort: a failed update
 * never throws, so a single bad org can't break the cron.
 */
export async function flagMissedVisits(
  organizationId: string,
  supabase: SupabaseWriter,
  now: Date = new Date()
): Promise<{ flagged: string[] }> {
  const cutoff = new Date(now.getTime() - MISSED_VISIT_GRACE_MINUTES * MS_PER_MINUTE).toISOString()

  const { data, error } = await supabase
    .from('evv_visits')
    .update({
      status: 'missed',
      exception_reason: 'Auto-flagged: no check-in before the scheduled visit ended.',
    })
    .eq('organization_id', organizationId)
    .eq('status', 'scheduled')
    .is('actual_start', null)
    .not('scheduled_end', 'is', null)
    .lt('scheduled_end', cutoff)
    .select('id')

  if (error) return { flagged: [] }
  return { flagged: ((data ?? []) as Array<{ id: string }>).map((r) => r.id) }
}
