import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { IncidentForm } from '@/components/incidents/incident-form'
import { IncidentStatusForm } from '@/components/incidents/incident-status-form'

const STATUS_STYLE: Record<string, { bg: string; dot: string; label: string }> = {
  open:              { bg: 'bg-red-50 text-red-700',    dot: 'bg-red-500',    label: 'Open' },
  under_review:      { bg: 'bg-amber-50 text-amber-700',dot: 'bg-amber-500',  label: 'Under Review' },
  reported_to_state: { bg: 'bg-blue-50 text-blue-700',  dot: 'bg-blue-500',   label: 'State Reported' },
  closed:            { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', label: 'Closed' },
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
            Incident Management
          </p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-[#3A2A4A]">Incidents</h1>
          <p className="mt-1 max-w-xl text-[13px] text-[#64748B]">
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
          className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          {!incidents || incidents.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8799E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <p className="text-[13px] font-semibold text-[#3A2A4A]">No incidents recorded</p>
              <p className="mt-1 text-[12px] text-[#94A3B8]">
                Document events here for admin visibility and AI audit monitoring.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['Incident', 'Client', 'Category', 'Occurred', 'Notifications', 'Follow-up', 'Status'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {incidents.map((incident: Record<string, unknown>) => {
                    const client = incident.clients as { legal_name: string } | null
                    const status = String(incident.status ?? 'open')
                    const style = STATUS_STYLE[status] ?? STATUS_STYLE.open
                    return (
                      <tr key={incident.id as string} className="align-top transition-colors hover:bg-gray-50/60">
                        <td className="px-5 py-4">
                          <p className="text-[13px] font-semibold text-[#3A2A4A]">{incident.incident_number as string}</p>
                          <p className="mt-0.5 max-w-[180px] truncate text-[11px] text-[#94A3B8]">{incident.description as string}</p>
                        </td>
                        <td className="px-5 py-4 text-[13px] text-[#64748B]">{client?.legal_name ?? '—'}</td>
                        <td className="px-5 py-4 text-[12px] capitalize text-[#64748B]">
                          {String(incident.category ?? '').replaceAll('_', ' ')}
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-[12px] tabular-nums text-[#64748B]">
                            {incident.occurred_at
                              ? new Date(incident.occurred_at as string).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                              : '—'}
                          </p>
                          {(incident.location as string) && (
                            <p className="mt-0.5 text-[11px] text-[#94A3B8]">{incident.location as string}</p>
                          )}
                        </td>
                        <td className="px-5 py-4 space-y-1">
                          <NotifLine checked={Boolean(incident.guardian_notified)} label="Guardian" />
                          <NotifLine checked={Boolean(incident.case_manager_notified)} label="Case Mgr" />
                          <NotifLine checked={Boolean(incident.dhs_reported)} label="DHS/State" />
                        </td>
                        <td className="px-5 py-4">
                          {incident.follow_up_required ? (
                            <span className="text-[12px] font-semibold text-amber-700">
                              Due {String(incident.follow_up_due_date ?? '—')}
                            </span>
                          ) : (
                            <span className="text-[12px] text-[#CBD5E1]">—</span>
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
      className={`rounded-2xl border bg-white px-5 py-3.5 text-center min-w-[90px] ${
        isAlert ? (variant === 'danger' ? 'border-red-100' : 'border-amber-100') : 'border-gray-100'
      }`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
    >
      <p className={`text-2xl font-bold tracking-tight ${
        isAlert ? (variant === 'danger' ? 'text-red-600' : 'text-amber-600') : 'text-[#3A2A4A]'
      }`}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">{label}</p>
    </div>
  )
}

function NotifLine({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${checked ? 'bg-emerald-100' : 'bg-gray-100'}`}>
        {checked ? (
          <svg width="7" height="7" viewBox="0 0 10 10" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2 5 4 7 8 3"/>
          </svg>
        ) : (
          <span className="h-1 w-1 rounded-full bg-gray-300" />
        )}
      </span>
      <span className={`text-[11px] ${checked ? 'text-[#64748B]' : 'text-[#CBD5E1]'}`}>{label}</span>
    </div>
  )
}
