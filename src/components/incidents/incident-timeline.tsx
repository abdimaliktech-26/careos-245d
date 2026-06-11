'use client'

type TimelineEvent = {
  label: string
  date: string | null
  icon: string
}

export function IncidentTimeline({ incident }: { incident: Record<string, unknown> }) {
  const events: TimelineEvent[] = [
    { label: 'Incident Reported', date: incident.created_at as string, icon: '!' },
    { label: 'Guardian Notified', date: incident.guardian_notified_at as string | null, icon: 'G' },
    { label: 'Case Manager Notified', date: incident.case_manager_notified_at as string | null, icon: 'C' },
    { label: 'DHS/State Reported', date: incident.dhs_reported_at as string | null, icon: 'S' },
    { label: 'Resolved', date: incident.resolved_at as string | null, icon: '✓' },
  ]

  const visible = events.filter((e) => e.date)

  if (visible.length === 0) return null

  return (
    <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <h2 className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase mb-4">Timeline</h2>
      <div className="space-y-0">
        {visible.map((event, i) => (
          <div key={event.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                {event.icon}
              </div>
              {i < visible.length - 1 && <div className="w-px flex-1 bg-muted" />}
            </div>
            <div className="pb-4">
              <p className="text-sm font-semibold text-foreground">{event.label}</p>
              <p className="text-xs text-muted-foreground">{event.date ? new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
