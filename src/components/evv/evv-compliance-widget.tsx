import { createClient } from '@/lib/supabase/server'
import { buildComplianceSummary, toComplianceVisit } from '@/lib/evv/compliance'

const LOOKBACK_DAYS = 30

const WIDGET_SELECT =
  'id, client_id, staff_id, service_name, service_date, scheduled_start, scheduled_end, actual_start, actual_end, status, check_in_location, check_out_location, check_in_distance_m, check_out_distance_m, progress_note, review_status, billing_status, billable_minutes, resolved_at'

type EvvComplianceWidgetProps = {
  organizationId: string
  clientId?: string
  staffId?: string
  title?: string
}

/**
 * Compact EVV compliance strip for dashboards and profile pages.
 * Server component — renders nothing if EVV data is unavailable.
 */
export async function EvvComplianceWidget({
  organizationId,
  clientId,
  staffId,
  title = 'EVV Compliance (30 days)',
}: EvvComplianceWidgetProps) {
  const supabase = await createClient()
  const since = new Date(new Date().getTime() - LOOKBACK_DAYS * 86400000).toISOString().slice(0, 10)

  let query = supabase
    .from('evv_visits')
    .select(WIDGET_SELECT)
    .eq('organization_id', organizationId)
    .gte('service_date', since)
    .limit(300)
  if (clientId) query = query.eq('client_id', clientId)
  if (staffId) query = query.eq('staff_id', staffId)

  const { data: visits, error } = await query
  if (error || !visits || visits.length === 0) return null

  const summary = buildComplianceSummary(visits.map((v) => toComplianceVisit(v as Record<string, unknown>)))
  const scoreTone =
    summary.complianceRate >= 90
      ? 'text-status-ok'
      : summary.complianceRate >= 70
        ? 'text-status-warn'
        : 'text-status-error'

  return (
    <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
        <a href="/evv" className="text-[11px] font-semibold text-primary hover:underline">
          Open EVV →
        </a>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-3">
        <div>
          <p className={`text-xl font-black tabular-nums ${scoreTone}`}>{summary.complianceRate}%</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Compliance</p>
        </div>
        <div>
          <p className="text-xl font-black tabular-nums text-foreground">{summary.completedCount}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Completed</p>
        </div>
        <div>
          <p className={`text-xl font-black tabular-nums ${summary.exceptions.length > 0 ? 'text-status-warn' : 'text-foreground'}`}>
            {summary.exceptions.length}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Exceptions</p>
        </div>
        <div>
          <p className="text-xl font-black tabular-nums text-foreground">{summary.billableHours}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Billable hrs</p>
        </div>
      </div>
    </div>
  )
}
