const moodColors: Record<string, string> = {
  '1': 'bg-status-error-bg text-status-error',
  '2': 'bg-status-warn-bg text-status-warn',
  '3': 'bg-status-warn-bg text-status-warn',
  '4': 'bg-status-ok-bg text-status-ok',
  '5': 'bg-status-ok-bg text-status-ok',
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  completed: 'bg-status-ok-bg text-status-ok',
  missed: 'bg-status-error-bg text-status-error',
  exception: 'bg-status-warn-bg text-status-warn',
}

function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${m} ${ampm}`
}

export function ShiftNoteCard({
  note,
}: {
  note: {
    id: string
    visit_date: string
    start_time: string
    end_time: string
    service_type: string
    mood_rating: number | null
    narrative: string
    staff_name: string
    created_at: string
  }
}) {
  const date = new Date(note.visit_date).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="care-panel rounded-2xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Shift Note</p>
          <p className="text-[13px] font-semibold text-foreground mt-0.5">{date}</p>
        </div>
        {note.mood_rating && (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${moodColors[String(note.mood_rating)] ?? 'bg-muted text-muted-foreground'}`}>
            Mood: {note.mood_rating}/5
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-2">
        <span>{formatTime(note.start_time)} – {formatTime(note.end_time)}</span>
        <span className="w-1 h-1 rounded-full bg-[#CBD5E1]" />
        <span className="capitalize">{note.service_type.replaceAll('_', ' ')}</span>
        <span className="w-1 h-1 rounded-full bg-[#CBD5E1]" />
        <span>{note.staff_name}</span>
      </div>
      <p className="text-[12px] text-[#334155] leading-relaxed line-clamp-3">{note.narrative}</p>
    </div>
  )
}

export function EvvLogCard({
  visit,
}: {
  visit: {
    id: string
    service_date: string
    scheduled_start: string | null
    scheduled_end: string | null
    actual_start: string | null
    actual_end: string | null
    service_name: string | null
    status: string
    check_in_method: string | null
    check_out_method: string | null
    notes: string | null
  }
}) {
  const date = new Date(visit.service_date).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })

  const fmt = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className="care-panel rounded-2xl p-4 border-l-4"
      style={{ borderLeftColor: visit.status === 'completed' ? '#10B981' : visit.status === 'in_progress' ? '#3B82F6' : visit.status === 'missed' ? '#EF4444' : '#CBD5E1' }}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">EVV Visit</p>
          <p className="text-[13px] font-semibold text-foreground mt-0.5">{visit.service_name ?? 'Service Visit'}</p>
          <p className="text-[11px] text-muted-foreground">{date}</p>
        </div>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColors[visit.status] ?? 'bg-muted text-muted-foreground'}`}>
          {visit.status.replaceAll('_', ' ')}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
        <div>
          <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Scheduled</span>
          <span>{fmt(visit.scheduled_start)} – {fmt(visit.scheduled_end)}</span>
        </div>
        <div>
          <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Actual</span>
          <span>{fmt(visit.actual_start)} – {fmt(visit.actual_end)}</span>
        </div>
        <div>
          <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Check-in</span>
          <span className="capitalize">{visit.check_in_method ?? '—'}</span>
        </div>
        <div>
          <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Check-out</span>
          <span className="capitalize">{visit.check_out_method ?? '—'}</span>
        </div>
      </div>
      {visit.notes && (
        <p className="mt-2 text-[11px] text-[#334155] leading-relaxed">{visit.notes}</p>
      )}
    </div>
  )
}
