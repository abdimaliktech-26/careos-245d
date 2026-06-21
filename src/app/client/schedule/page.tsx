import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'

function statusColor(status: string) {
  const colors: Record<string, string> = {
    scheduled: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    completed: 'bg-status-ok-bg text-status-ok',
    cancelled: 'bg-status-error-bg text-status-error',
    no_show: 'bg-status-warn-bg text-status-warn',
  }
  return colors[status] ?? 'bg-muted text-muted-foreground'
}

export default async function ClientSchedulePage() {
  const { user, error } = await getSession()
  if (error || !user || user.role !== 'external_signer') redirect('/auth/login')

  const supabase = await createClient()

  const { data: links } = await supabase
    .from('signing_links')
    .select('packet_id, packets!inner(client_id)')
    .eq('signer_email', user.email)
    .limit(1)

  const link = (links ?? [])[0] as unknown as { packets?: { client_id: string } } | undefined
  const clientId = link?.packets?.client_id

  if (!clientId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <p className="text-sm font-semibold text-foreground">No client record linked</p>
        <p className="mt-1 text-xs text-muted-foreground">Your account is not yet linked to a client record.</p>
      </div>
    )
  }

  const today = new Date().toISOString().slice(0, 10)
  const { data: schedules } = await supabase
    .from('schedules')
    .select('id, scheduled_date, start_time, end_time, service_type, status, staff_name, notes')
    .eq('client_id', clientId)
    .gte('scheduled_date', today)
    .order('scheduled_date', { ascending: true })
    .limit(30)

  const rows = (schedules ?? []) as Array<Record<string, unknown>>
  const upcoming = rows.filter((s) => s.status === 'scheduled')
  const past = rows.filter((s) => s.status !== 'scheduled')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Client Portal · Schedule
        </p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">
          Upcoming Schedule
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          View your upcoming service appointments.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="care-panel rounded-2xl flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B99A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-foreground">No appointments scheduled</p>
          <p className="mt-1 text-xs text-muted-foreground">Check back later for upcoming service appointments.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Upcoming</h2>
              <div className="space-y-2">
                {upcoming.map((s) => {
                  const sd = new Date(s.scheduled_date as string)
                  const start = (s.start_time as string) ?? ''
                  const end = (s.end_time as string) ?? ''
                  const svcType = (s.service_type as string) ?? ''
                  const staffName = (s.staff_name as string | null) ?? null
                  return (
                    <div key={s.id as string} className="care-panel rounded-2xl p-4 border-l-4 border-l-primary">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-semibold text-foreground">
                            {sd.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {start.slice(0, 5)} – {end.slice(0, 5)} · {svcType.replaceAll('_', ' ')}
                          </p>
                          {staffName && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">Staff: {staffName}</p>
                          )}
                        </div>
                        <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusColor(s.status as string)}`}>
                          {s.status as string}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Past</h2>
              <div className="space-y-2">
                {past.map((s) => {
                  const sd = new Date(s.scheduled_date as string)
                  const start = (s.start_time as string) ?? ''
                  const end = (s.end_time as string) ?? ''
                  return (
                    <div key={s.id as string} className="care-panel rounded-2xl p-4 opacity-70">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-semibold text-foreground">
                            {sd.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {start.slice(0, 5)} – {end.slice(0, 5)}
                          </p>
                        </div>
                        <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusColor(s.status as string)}`}>
                          {s.status as string}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
