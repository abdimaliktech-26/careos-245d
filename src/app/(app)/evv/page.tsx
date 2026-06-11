import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { EvvVisitForm } from '@/components/evv/evv-visit-form'
import { EvvGpsCard } from '@/components/evv/evv-gps-card'
import { EvvPageClient } from './evv-page-client'

const now = Date.now()

export default async function EvvPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>
}) {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')
  if (!user.organizationId) redirect('/dashboard')

  const params = await searchParams
  const today = new Date().toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString().slice(0, 10)

  const startDate = params.startDate ?? thirtyDaysAgo
  const endDate = params.endDate ?? today

  const supabase = await createClient()

  const [{ data: visits, error: visitsError }, { data: clients }, { data: staff }, { data: schedules }] = await Promise.all([
    supabase
      .from('evv_visits')
      .select('id, client_id, service_date, service_name, status, scheduled_start, scheduled_end, actual_start, actual_end, exception_reason, check_in_method, check_out_method, clients(legal_name), staff_profiles(full_name)')
      .eq('organization_id', user.organizationId)
      .gte('service_date', startDate)
      .lte('service_date', endDate)
      .order('service_date', { ascending: false })
      .limit(100),
    supabase
      .from('clients')
      .select('id, legal_name')
      .eq('organization_id', user.organizationId)
      .eq('status', 'active')
      .order('legal_name'),
    supabase
      .from('staff_profiles')
      .select('id, full_name')
      .eq('organization_id', user.organizationId)
      .eq('is_active', true)
      .order('full_name'),
    supabase
      .from('schedules')
      .select('id, client_id, scheduled_date, start_time, end_time, service_type, status')
      .eq('organization_id', user.organizationId)
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate),
  ])

  // Build a lookup from (client_id + date) to schedule entries for linking
  const scheduleByClientDate = new Map<string, Array<Record<string, unknown>>>()
  for (const s of schedules ?? []) {
    const key = `${s.client_id}|${s.scheduled_date}`
    if (!scheduleByClientDate.has(key)) scheduleByClientDate.set(key, [])
    scheduleByClientDate.get(key)!.push(s)
  }

  // Annotate visits with linked schedule info
  const annotatedVisits = (visits ?? []).map((v) => {
    const key = `${v.client_id}|${v.service_date}`
    const linkedSchedules = scheduleByClientDate.get(key) ?? []
    return { ...v, _linkedSchedules: linkedSchedules }
  })

  // Status counts
  const scheduledCount = (visits ?? []).filter((v) => v.status === 'scheduled').length
  const inProgressCount = (visits ?? []).filter((v) => v.status === 'in_progress').length
  const completedCount = (visits ?? []).filter((v) => v.status === 'completed').length
  const missedCount = (visits ?? []).filter((v) => v.status === 'missed').length

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Electronic Visit Verification
        </p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">EVV Visits</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Track visit evidence used by the AI Audit Assistant — service date, staff, client, time records, and exceptions.
        </p>
      </div>

      {/* Status summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatusSummaryCard label="Scheduled" value={scheduledCount} color="text-blue-600 dark:text-blue-300" bg="bg-blue-50 dark:bg-blue-500/15" />
        <StatusSummaryCard label="In Progress" value={inProgressCount} color="text-status-warn" bg="bg-status-warn-bg" />
        <StatusSummaryCard label="Completed" value={completedCount} color="text-status-ok" bg="bg-status-ok-bg" />
        <StatusSummaryCard label="Missed" value={missedCount} color="text-status-error" bg="bg-status-error-bg" />
      </div>

      {/* Date range filter */}
      <EvvPageClient startDate={startDate} endDate={endDate} />

      {/* Today's GPS check-in/out */}
      {visits && visits.length > 0 && (
        <div className="mb-6 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">GPS Check-in/out</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(annotatedVisits as Array<Record<string, unknown>>)
              .filter((v) => v.status === 'scheduled' || v.status === 'in_progress')
              .slice(0, 6)
              .map((visit: Record<string, unknown>) => {
                const client = visit.clients as { legal_name: string } | null
                const staffProfile = visit.staff_profiles as { full_name: string } | null
                return (
                  <EvvGpsCard
                    key={visit.id as string}
                    visit={{
                      id: visit.id as string,
                      clientName: client?.legal_name ?? '—',
                      staffName: staffProfile?.full_name ?? '—',
                      serviceName: visit.service_name as string,
                      serviceDate: visit.service_date as string,
                      status: visit.status as string,
                    }}
                  />
                )
              })}
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        {visitsError ? (
          <div
            className="rounded-2xl border border-amber-100 bg-status-warn-bg p-6"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-status-warn">EVV table not active yet</p>
                <p className="mt-1 text-[12px] text-status-warn leading-relaxed">
                  Apply migration{' '}
                  <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[11px]">
                    202606070005_audit_automation_evv.sql
                  </code>{' '}
                  in Supabase SQL Editor to enable EVV visit tracking.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-2xl border border-border bg-card"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            {!visits || visits.length === 0 ? (
              <div className="px-6 py-20 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DB2777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <p className="text-[13px] font-semibold text-foreground">No EVV visits recorded</p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Import or enter EVV visits so the audit assistant can verify them.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {['Date', 'Client', 'Staff', 'Service', 'Scheduled', 'Actual', 'Status', 'Schedule Link'].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {annotatedVisits.map((visit: Record<string, unknown>) => {
                      const client = visit.clients as { legal_name: string } | null
                      const staffProfile = visit.staff_profiles as { full_name: string } | null
                      const status = String(visit.status ?? 'scheduled')
                      const style = STATUS_STYLE[status] ?? STATUS_STYLE.scheduled
                      const fmtTime = (ts: unknown) =>
                        ts ? new Date(ts as string).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—'
                      const linkedSchedules = visit._linkedSchedules as Array<Record<string, unknown>> | undefined
                      return (
                        <tr key={visit.id as string} className="transition-colors hover:bg-muted/40">
                          <td className="px-5 py-3.5 text-[13px] font-medium tabular-nums text-foreground">
                            {visit.service_date as string}
                          </td>
                          <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{client?.legal_name ?? '—'}</td>
                          <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{staffProfile?.full_name ?? '—'}</td>
                          <td className="px-5 py-3.5 text-[12px] text-muted-foreground">{(visit.service_name as string) ?? '—'}</td>
                          <td className="px-5 py-3.5 text-[12px] tabular-nums text-muted-foreground">
                            {fmtTime(visit.scheduled_start)}–{fmtTime(visit.scheduled_end)}
                          </td>
                          <td className="px-5 py-3.5 text-[12px] tabular-nums text-muted-foreground">
                            {fmtTime(visit.actual_start)}–{fmtTime(visit.actual_end)}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${style.bg}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                              {style.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            {linkedSchedules && linkedSchedules.length > 0 ? (
                              <a
                                href={`/schedule?edit=${linkedSchedules[0].id}`}
                                className="text-[10px] font-semibold text-primary hover:underline"
                              >
                                View Schedule
                              </a>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <EvvVisitForm
          clients={(clients ?? []) as Array<{ id: string; legal_name: string }>}
          staff={(staff ?? []) as Array<{ id: string; full_name: string }>}
        />
      </div>
    </div>
  )
}

const STATUS_STYLE: Record<string, { bg: string; dot: string; label: string }> = {
  scheduled:   { bg: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',    dot: 'bg-blue-500',    label: 'Scheduled' },
  in_progress: { bg: 'bg-status-warn-bg text-status-warn',  dot: 'bg-status-warn',   label: 'In Progress' },
  completed:   { bg: 'bg-status-ok-bg text-status-ok', dot: 'bg-status-ok', label: 'Completed' },
  missed:      { bg: 'bg-status-error-bg text-status-error',      dot: 'bg-status-error',     label: 'Missed' },
  exception:   { bg: 'bg-status-warn-bg text-status-warn',dot: 'bg-status-warn',  label: 'Exception' },
}

function StatusSummaryCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`rounded-2xl border border-border shadow-sm px-5 py-4 ${bg}`}>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mt-1">{label}</p>
    </div>
  )
}
