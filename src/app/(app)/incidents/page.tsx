import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { IncidentForm } from '@/components/incidents/incident-form'
import { IncidentStatusForm } from '@/components/incidents/incident-status-form'

const STATUS_STYLE: Record<string, { bg: string; dot: string; label: string }> = {
  open:              { bg: 'bg-status-error-bg text-status-error',    dot: 'bg-status-error',    label: 'Open' },
  under_review:      { bg: 'bg-status-warn-bg text-status-warn',dot: 'bg-status-warn',  label: 'Under Review' },
  reported_to_state: { bg: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',  dot: 'bg-blue-500',   label: 'State Reported' },
  closed:            { bg: 'bg-status-ok-bg text-status-ok', dot: 'bg-status-ok', label: 'Closed' },
}

export default async function IncidentsPage() {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')
  if (!user.organizationId) redirect('/dashboard')

  const supabase = await createClient()
  const [{ data: clients }, { data: incidents }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, legal_name')
      .eq('organization_id', user.organizationId)
      .order('legal_name'),
    supabase
      .from('incidents')
      .select('id, incident_number, category, status, occurred_at, location, description, guardian_notified, case_manager_notified, dhs_reported, follow_up_required, follow_up_due_date, clients(legal_name)')
      .eq('organization_id', user.organizationId)
      .order('occurred_at', { ascending: false })
      .limit(100),
  ])

  const openCount = (incidents ?? []).filter((i) => i.status !== 'closed').length
  const followUpCount = (incidents ?? []).filter((i) => i.follow_up_required && i.status !== 'closed').length
  const stateReportedCount = (incidents ?? []).filter((i) => i.dhs_reported).length

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Incident Management
          </p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">Incidents</h1>
          <p className="mt-1 max-w-xl text-[13px] text-muted-foreground">
            Capture events, notifications, DHS/state reporting status, follow-up due dates, and the audit trail.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <MetricCard label="Open" value={openCount} variant="danger" />
          <MetricCard label="Follow-up" value={followUpCount} variant="warning" />
          <MetricCard label="State Reported" value={stateReportedCount} variant="default" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        {/* Incidents table */}
        <div
          className="overflow-hidden rounded-2xl border border-border bg-card"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          {!incidents || incidents.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DB2777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <p className="text-[13px] font-semibold text-foreground">No incidents recorded</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Document events here for admin visibility and AI audit monitoring.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {['Incident', 'Client', 'Category', 'Occurred', 'Notifications', 'Follow-up', 'Status'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {incidents.map((incident: Record<string, unknown>) => {
                    const client = incident.clients as { legal_name: string } | null
                    const status = String(incident.status ?? 'open')
                    const style = STATUS_STYLE[status] ?? STATUS_STYLE.open
                    return (
                      <tr key={incident.id as string} className="align-top transition-colors hover:bg-muted/40">
                        <td className="px-5 py-4">
                          <p className="text-[13px] font-semibold text-foreground">{incident.incident_number as string}</p>
                          <p className="mt-0.5 max-w-[180px] truncate text-[11px] text-muted-foreground">{incident.description as string}</p>
                        </td>
                        <td className="px-5 py-4 text-[13px] text-muted-foreground">{client?.legal_name ?? '—'}</td>
                        <td className="px-5 py-4 text-[12px] capitalize text-muted-foreground">
                          {String(incident.category ?? '').replaceAll('_', ' ')}
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-[12px] tabular-nums text-muted-foreground">
                            {incident.occurred_at
                              ? new Date(incident.occurred_at as string).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                              : '—'}
                          </p>
                          {(incident.location as string) && (
                            <p className="mt-0.5 text-[11px] text-muted-foreground">{incident.location as string}</p>
                          )}
                        </td>
                        <td className="px-5 py-4 space-y-1">
                          <NotifLine checked={Boolean(incident.guardian_notified)} label="Guardian" />
                          <NotifLine checked={Boolean(incident.case_manager_notified)} label="Case Mgr" />
                          <NotifLine checked={Boolean(incident.dhs_reported)} label="DHS/State" />
                        </td>
                        <td className="px-5 py-4">
                          {incident.follow_up_required ? (
                            <span className="text-[12px] font-semibold text-status-warn">
                              Due {String(incident.follow_up_due_date ?? '—')}
                            </span>
                          ) : (
                            <span className="text-[12px] text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${style.bg}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                            {style.label}
                          </span>
                          <IncidentStatusForm incidentId={incident.id as string} status={status} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <IncidentForm clients={(clients ?? []) as Array<{ id: string; legal_name: string }>} />
      </div>
    </div>
  )
}

function MetricCard({ label, value, variant }: { label: string; value: number; variant: 'danger' | 'warning' | 'default' }) {
  const isAlert = variant !== 'default' && value > 0
  return (
    <div
      className={`rounded-2xl border bg-card px-5 py-3.5 text-center min-w-[90px] ${
        isAlert ? (variant === 'danger' ? 'border-red-100' : 'border-amber-100') : 'border-border'
      }`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
    >
      <p className={`text-2xl font-bold tracking-tight ${
        isAlert ? (variant === 'danger' ? 'text-status-error' : 'text-status-warn') : 'text-foreground'
      }`}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
    </div>
  )
}

function NotifLine({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${checked ? 'bg-status-ok-bg' : 'bg-muted'}`}>
        {checked ? (
          <svg width="7" height="7" viewBox="0 0 10 10" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2 5 4 7 8 3"/>
          </svg>
        ) : (
          <span className="h-1 w-1 rounded-full bg-gray-300" />
        )}
      </span>
      <span className={`text-[11px] ${checked ? 'text-muted-foreground' : 'text-muted-foreground'}`}>{label}</span>
    </div>
  )
}
