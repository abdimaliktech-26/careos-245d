import type { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { toComplianceVisit } from '@/lib/evv/compliance'
import { getAggregatorConfig } from './config'
import { buildAggregatorPayload, resolveExternalIds, validateForTransmission } from './mapping'
import { getAdapter } from './registry'
import { applyOutcome, type TransmissionPatch, type TransmissionRow } from './transitions'
import type { ResolvedAggregatorConfig, TransmissionOutcome } from './types'

type SupabaseWriter = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>

// A row claimed for sending but never finalized (worker crash, timeout) is
// reclaimed after this window so it can't get stuck forever.
const STUCK_SENDING_MINUTES = 15

const VISIT_SELECT =
  'id, client_id, staff_id, service_name, service_date, scheduled_start, scheduled_end, actual_start, actual_end, status, check_in_location, check_out_location, check_in_distance_m, check_out_distance_m, progress_note, review_status, billing_status, billable_minutes, resolved_at, clients(legal_name, medicaid_number), staff_profiles(full_name, caregiver_id)'

/**
 * Queues a verified visit for transmission. Idempotent: the unique
 * (org, idempotency_key) constraint means a visit is enqueued at most once, so
 * approving twice can never double-submit / double-bill.
 */
export async function enqueueVisitTransmission(
  organizationId: string,
  visitId: string,
  supabase: SupabaseWriter
): Promise<{ queued: boolean }> {
  const config = await getAggregatorConfig(organizationId, supabase)
  const vendor = config?.vendor ?? 'none'
  const now = new Date().toISOString()

  // Transmission rows are system-managed: RLS allows tenants to read but not
  // write. Use the service-role client so enqueue works from a user-scoped
  // request (e.g. a supervisor approving billing).
  const admin = createAdminClient()

  // One visit = one transmission row (idempotency key = visit id).
  const { data: existing } = await admin
    .from('evv_aggregator_transmissions')
    .select('id, status')
    .eq('organization_id', organizationId)
    .eq('idempotency_key', visitId)
    .maybeSingle()

  const existingStatus = (existing as { id?: string; status?: string } | null)?.status

  // Already accepted or in-flight → idempotent no-op (never double-submit).
  if (existingStatus === 'accepted' || existingStatus === 'queued' || existingStatus === 'sending') {
    return { queued: true }
  }

  if (existing) {
    // A prior attempt was rejected/failed and the visit is being re-approved
    // (presumably after a fix) → reset for another attempt.
    const { error } = await admin
      .from('evv_aggregator_transmissions')
      .update({ status: 'queued', next_attempt_at: now, last_error: null, vendor })
      .eq('id', (existing as { id: string }).id)
    if (error) return { queued: false }
  } else {
    const { error } = await admin.from('evv_aggregator_transmissions').insert({
      organization_id: organizationId,
      visit_id: visitId,
      vendor,
      status: 'queued',
      idempotency_key: visitId,
      next_attempt_at: now,
    })
    if (error) return { queued: false }
  }

  await admin
    .from('evv_visits')
    .update({ aggregator_status: 'queued' })
    .eq('id', visitId)
    .eq('organization_id', organizationId)

  return { queued: true }
}

export type QueueRunSummary = {
  processed: number
  accepted: number
  rejected: number
  retried: number
  failed: number
  held: number
}

/**
 * Processes due transmissions. Each row is claimed (→ sending), validated,
 * transmitted via the org's vendor adapter, then transitioned by the pure
 * policy in `applyOutcome`. Safe to run concurrently-ish: claiming flips status
 * off 'queued' before the network call.
 */
export async function processTransmissionQueue(
  supabase: SupabaseWriter,
  options: { now?: Date; limit?: number } = {}
): Promise<QueueRunSummary> {
  const now = options.now ?? new Date()
  const limit = options.limit ?? 100
  const summary: QueueRunSummary = { processed: 0, accepted: 0, rejected: 0, retried: 0, failed: 0, held: 0 }

  // Recover rows stuck mid-flight from a crashed/timed-out prior run.
  await reclaimStuckTransmissions(supabase, now)

  const { data: due } = await supabase
    .from('evv_aggregator_transmissions')
    .select('id, organization_id, visit_id, vendor, status, attempts, max_attempts')
    .eq('status', 'queued')
    .lte('next_attempt_at', now.toISOString())
    .order('next_attempt_at', { ascending: true })
    .limit(limit)

  const rows = (due ?? []) as Array<{
    id: string
    organization_id: string
    visit_id: string
    vendor: string
    status: TransmissionRow['status']
    attempts: number
    max_attempts: number
  }>

  const configCache = new Map<string, ResolvedAggregatorConfig | null>()

  for (const row of rows) {
    // Atomic claim: only proceed if THIS worker flipped it off 'queued'.
    // A parallel worker that already claimed it returns no row here → skip.
    const { data: claimed } = await supabase
      .from('evv_aggregator_transmissions')
      .update({ status: 'sending', updated_at: now.toISOString() })
      .eq('id', row.id)
      .eq('status', 'queued')
      .select('id')
    if (!claimed || claimed.length === 0) continue

    summary.processed++
    const outcome = await transmitRow(row, supabase, configCache)
    const patch = applyOutcome(row, outcome, now)
    await persistPatch(row, patch, supabase, now)
    tally(summary, patch)
  }

  return summary
}

/** Returns 'sending' rows older than the stuck window back to 'queued'. */
async function reclaimStuckTransmissions(supabase: SupabaseWriter, now: Date): Promise<void> {
  const cutoff = new Date(now.getTime() - STUCK_SENDING_MINUTES * 60_000).toISOString()
  await supabase
    .from('evv_aggregator_transmissions')
    .update({ status: 'queued', next_attempt_at: now.toISOString() })
    .eq('status', 'sending')
    .lt('updated_at', cutoff)
}

async function transmitRow(
  row: { organization_id: string; visit_id: string },
  supabase: SupabaseWriter,
  configCache: Map<string, ResolvedAggregatorConfig | null>
): Promise<TransmissionOutcome> {
  if (!configCache.has(row.organization_id)) {
    configCache.set(row.organization_id, await getAggregatorConfig(row.organization_id, supabase))
  }
  const config = configCache.get(row.organization_id) ?? null
  if (!config || config.vendor === 'none' || !config.enabled) {
    return { kind: 'not_configured', reason: 'No enabled aggregator for this organization.' }
  }

  const { data: visitRow, error } = await supabase
    .from('evv_aggregator_transmissions')
    .select(`evv_visits!inner(${VISIT_SELECT})`)
    .eq('visit_id', row.visit_id)
    .eq('organization_id', row.organization_id)
    .limit(1)
    .maybeSingle()

  const raw = (visitRow as { evv_visits?: Record<string, unknown> } | null)?.evv_visits
  if (error || !raw) return { kind: 'retryable', reason: 'Visit could not be loaded.' }

  const visit = toComplianceVisit(raw)
  const eligibility = validateForTransmission(visit)
  if (!eligibility.ok) {
    // Non-compliant data is a permanent reject — a human must fix the visit.
    return { kind: 'rejected', reason: eligibility.reasons.join(' ') }
  }

  // Resolve the aggregator-facing recipient/caregiver IDs. Missing IDs make the
  // visit un-billable → permanent reject until an admin fills them in.
  const client = raw.clients as { medicaid_number?: string | null } | null
  const staff = raw.staff_profiles as { caregiver_id?: string | null } | null
  const ids = resolveExternalIds({
    clientMedicaidNumber: client?.medicaid_number,
    staffId: visit.staffId,
    staffCaregiverId: staff?.caregiver_id,
  })
  if (ids.missing.length > 0) {
    return { kind: 'rejected', reason: ids.missing.join(' ') }
  }

  const adapter = getAdapter(config.vendor)
  if (!adapter) return { kind: 'not_configured', reason: `No adapter for vendor ${config.vendor}.` }

  const payload = buildAggregatorPayload(visit, {
    providerId: config.providerId,
    clientExternalId: ids.clientExternalId!,
    caregiverExternalId: ids.caregiverExternalId,
  })

  return adapter.transmit(payload, config)
}

async function persistPatch(
  row: { id: string; visit_id: string; organization_id: string },
  patch: TransmissionPatch,
  supabase: SupabaseWriter,
  now: Date
): Promise<void> {
  await supabase
    .from('evv_aggregator_transmissions')
    .update({
      status: patch.status,
      attempts: patch.attempts,
      last_error: patch.last_error,
      external_id: patch.external_id ?? null,
      next_attempt_at: patch.next_attempt_at ?? now.toISOString(),
      response_payload: patch.response_payload ?? null,
      updated_at: now.toISOString(),
    })
    .eq('id', row.id)

  await supabase
    .from('evv_visits')
    .update({
      aggregator_status: patch.status,
      ...(patch.status === 'accepted'
        ? { aggregator_synced_at: now.toISOString(), aggregator_external_id: patch.external_id ?? null }
        : {}),
    })
    .eq('id', row.visit_id)
    .eq('organization_id', row.organization_id)

  // Append to the immutable audit trail for accept/reject/failure events.
  if (patch.status === 'accepted' || patch.status === 'rejected' || patch.status === 'failed') {
    await supabase
      .from('audit_logs')
      .insert({
        organization_id: row.organization_id,
        user_email: 'system@evv-aggregator',
        action: 'packet_updated',
        entity_type: 'evv_transmission',
        entity_id: row.visit_id,
        entity_label: `Aggregator transmission ${patch.status}`,
        details: { status: patch.status, error: patch.last_error, externalId: patch.external_id ?? null },
      })
      .then(() => null, () => null)
  }
}

function tally(summary: QueueRunSummary, patch: TransmissionPatch): void {
  if (patch.status === 'accepted') summary.accepted++
  else if (patch.status === 'rejected') summary.rejected++
  else if (patch.status === 'failed') summary.failed++
  else if (patch.status === 'queued' && patch.attempts > 0) summary.retried++
  else summary.held++
}
