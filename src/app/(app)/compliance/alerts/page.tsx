import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { getActiveAlerts, getAlertSummary } from '@/lib/audit/compliance-alerts'
import { getRecentFlaggedRuns } from '@/lib/agent/queries'
import { AlertCard } from '@/components/compliance/alert-card'
import { AlertFilters } from '@/components/compliance/alert-filters'
import { DismissButton } from '@/components/compliance/dismiss-button'

type SearchParams = Promise<{ type?: string; severity?: string }>

function StatsCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`rounded-2xl border ${color} p-4`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-current opacity-70">{label}</p>
      <p className="mt-2 text-3xl font-black text-current">{count}</p>
    </div>
  )
}

export default async function ComplianceAlertsPage(props: { searchParams: SearchParams }) {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')
  if (!user.organizationId) redirect('/dashboard')

  const searchParams = await props.searchParams
  const alerts = await getActiveAlerts(user.organizationId, {
    type: searchParams.type,
    severity: searchParams.severity,
  })
  const summary = await getAlertSummary(user.organizationId)
  const agentRuns = await getRecentFlaggedRuns()

  const verdictColor = (v: string) =>
    v === 'fail'
      ? 'bg-status-error-bg text-status-error border-red-200'
      : 'bg-status-warn-bg text-status-warn border-amber-200'

  return (
    <div>
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Compliance
        </p>
        <div className="mt-1.5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Compliance Alerts</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Proactive alerts for upcoming deadlines, missing signatures, and overdue items.
            </p>
          </div>
          <AlertFilters />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatsCard label="Total Active" count={summary.total} color="bg-muted text-foreground border-border" />
        <StatsCard label="Critical" count={summary.critical} color="bg-status-error-bg text-status-error border-red-200" />
        <StatsCard label="Warning" count={summary.warning} color="bg-status-warn-bg text-status-warn border-amber-200" />
        <StatsCard label="Info" count={summary.info} color="bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 border-blue-200" />
      </div>

      <section
        className="overflow-hidden rounded-2xl border border-border bg-card"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-[14px] font-semibold text-foreground">Active Alerts</h2>
        </div>
        {alerts.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <p className="text-[13px] font-semibold text-foreground">No active compliance alerts</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Your organization is on track based on the current check.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {alerts.map((alert) => (
              <div key={alert.id} className="px-6 py-4">
                <AlertCard alert={alert} onDismiss={async () => {}} showActions={false} />
                <div className="mt-2 flex justify-end">
                  <DismissButton alertId={alert.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section
        className="mt-8 overflow-hidden rounded-2xl border border-border bg-card"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-[14px] font-semibold text-foreground">Agent Validation Flags</h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Recent intake &amp; EVV validation runs that need attention. Program recommendations require human confirmation.
          </p>
        </div>
        {agentRuns.length === 0 ? (
          <div className="px-6 py-10 text-center text-[13px] text-muted-foreground">
            No flagged validation runs.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {agentRuns.map((run) => (
              <div key={run.id} className="px-6 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${verdictColor(run.verdict)}`}>
                      {run.verdict}
                    </span>
                    <span className="text-[13px] font-semibold text-foreground">
                      {run.subject_type === 'intake_form' ? 'Intake form' : 'EVV visit'}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{run.trigger}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(run.created_at).toLocaleString()}
                  </span>
                </div>
                {run.flags.length > 0 && (
                  <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[12px] text-muted-foreground">
                    {run.flags.map((f, i) => (
                      <li key={`${run.id}-${i}`}>{f.message}</li>
                    ))}
                  </ul>
                )}
                {run.program_recommendation && (
                  <p className="mt-2 text-[12px] text-foreground">
                    Suggested program: <span className="font-semibold">{run.program_recommendation.program}</span>{' '}
                    <span className="text-muted-foreground">
                      ({Math.round(run.program_recommendation.confidence * 100)}% — {run.program_recommendation.reason}) — confirm manually.
                    </span>
                  </p>
                )}
                <p className="mt-2 text-[12px] text-muted-foreground">
                  {run.ai_status === 'done' && run.ai_summary
                    ? run.ai_summary
                    : run.ai_status === 'error'
                      ? 'AI explanation unavailable.'
                      : 'AI explanation pending…'}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
