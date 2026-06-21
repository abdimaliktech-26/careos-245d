import { getSession } from '@/lib/auth/get-session'
import { runAiText } from '@/lib/ai/gateway'
import { createClient } from '@/lib/supabase/server'
import { buildComplianceSummary, toComplianceVisit } from '@/lib/evv/compliance'
import { EVV_INSIGHTS_SYSTEM_PROMPT, buildEvvInsightsPrompt } from '@/lib/ai/evv-insights'

const LOOKBACK_DAYS = 30
const VISIT_LIMIT = 400

export async function POST() {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString().slice(0, 10)

  const { data: visits, error: visitsError } = await supabase
    .from('evv_visits')
    .select(
      'id, client_id, staff_id, service_name, service_date, scheduled_start, scheduled_end, actual_start, actual_end, status, check_in_location, check_out_location, check_in_distance_m, check_out_distance_m, progress_note, review_status, billing_status, billable_minutes, resolved_at, clients(legal_name), staff_profiles(full_name)'
    )
    .eq('organization_id', user.organizationId)
    .gte('service_date', since)
    .limit(VISIT_LIMIT)

  if (visitsError) {
    return Response.json({ error: 'EVV data unavailable. Apply the latest migration.' }, { status: 409 })
  }

  const summary = buildComplianceSummary((visits ?? []).map(toComplianceVisit))

  const ai = await runAiText({
    organizationId: user.organizationId, userId: user.id, feature: 'evv_insights',
    system: EVV_INSIGHTS_SYSTEM_PROMPT,
    prompt: buildEvvInsightsPrompt(summary, `last ${LOOKBACK_DAYS} days`),
  })
  if (!ai.ok) {
    return Response.json({ error: ai.message, reason: ai.reason }, { status: ai.reason === 'ai_error' ? 502 : 409 })
  }
  return Response.json({
    insights: ai.text.trim(),
    isDraft: true,
    complianceRate: summary.complianceRate,
    exceptionCount: summary.exceptions.length,
  })
}
