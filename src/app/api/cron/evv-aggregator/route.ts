import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { processTransmissionQueue } from '@/lib/evv/aggregator/queue'
import { toComplianceVisit } from '@/lib/evv/compliance'
import { runEvvValidation } from '@/lib/agent/pipeline'

export const runtime = 'nodejs'

const SWEEP_LOOKBACK_DAYS = 7

/** Daily re-validation of recent/open EVV visits. Dedups one run per visit per day. */
async function runDailySweep(admin: ReturnType<typeof createAdminClient>): Promise<number> {
  const since = new Date(new Date().getTime() - SWEEP_LOOKBACK_DAYS * 86400000).toISOString().slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)

  const { data: visits } = await admin
    .from('evv_visits')
    .select('*, clients(legal_name), staff_profiles(full_name)')
    .gte('service_date', since)
    .in('status', ['completed', 'in_progress'])

  let validated = 0
  for (const row of visits ?? []) {
    const { data: existing } = await admin
      .from('agent_validation_runs')
      .select('id')
      .eq('subject_id', row.id)
      .eq('trigger', 'daily_sweep')
      .gte('created_at', `${today}T00:00:00Z`)
      .maybeSingle()
    if (existing) continue

    await runEvvValidation(
      toComplianceVisit(row as Record<string, unknown>),
      'daily_sweep',
      { organizationId: row.organization_id as string, userId: null },
    ).catch(() => null)
    validated += 1
  }
  return validated
}

function isAuthorized(request: NextRequest) {
  const configuredSecret = process.env.CRON_SECRET
  if (!configuredSecret) return false

  const authHeader = request.headers.get('authorization')
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
  const querySecret = request.nextUrl.searchParams.get('secret')
  return bearer === configuredSecret || querySecret === configuredSecret
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const summary = await processTransmissionQueue(admin)
    // Purge stale live-location breadcrumbs (kept 7 days after a visit ends).
    await admin.rpc('purge_stale_location_pings').then(() => null, () => null)
    const sweepValidated = await runDailySweep(admin)
    return NextResponse.json({ ok: true, ...summary, sweepValidated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Aggregator queue run failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
