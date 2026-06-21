import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { ShiftNoteCard, EvvLogCard } from '@/components/portal/service-log-card'

const now = Date.now()

export default async function ClientServiceLogsPage() {
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

  const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString().slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)

  const [shiftNotesResult, evvVisitsResult] = await Promise.all([
    supabase
      .from('shift_notes')
      .select('id, visit_date, start_time, end_time, service_type, mood_rating, narrative, staff_name, created_at')
      .eq('client_id', clientId)
      .gte('visit_date', thirtyDaysAgo)
      .lte('visit_date', today)
      .order('visit_date', { ascending: false })
      .limit(30),
    supabase
      .from('evv_visits')
      .select('id, service_date, scheduled_start, scheduled_end, actual_start, actual_end, service_name, status, check_in_method, check_out_method, notes')
      .eq('client_id', clientId)
      .gte('service_date', thirtyDaysAgo)
      .lte('service_date', today)
      .order('service_date', { ascending: false })
      .limit(30),
  ])

  const shiftNotes = (shiftNotesResult.data ?? []) as Array<Record<string, unknown>>
  const evvVisits = (evvVisitsResult.data ?? []) as Array<Record<string, unknown>>

  const hasData = shiftNotes.length > 0 || evvVisits.length > 0

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Client Portal · Service Logs
        </p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">
          Service Logs
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          View recent shift notes and EVV visit logs from the last 30 days.
        </p>
      </div>

      {!hasData ? (
        <div className="care-panel rounded-2xl flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B99A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-foreground">No service logs yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Shift notes and EVV visits from the last 30 days will appear here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {shiftNotes.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Shift Notes ({shiftNotes.length})
              </h2>
              <div className="space-y-3">
                {shiftNotes.map((note) => (
                  <ShiftNoteCard key={note.id as string} note={note as Parameters<typeof ShiftNoteCard>[0]['note']} />
                ))}
              </div>
            </div>
          )}

          {evvVisits.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                EVV Visit Logs ({evvVisits.length})
              </h2>
              <div className="space-y-3">
                {evvVisits.map((visit) => (
                  <EvvLogCard key={visit.id as string} visit={visit as Parameters<typeof EvvLogCard>[0]['visit']} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
