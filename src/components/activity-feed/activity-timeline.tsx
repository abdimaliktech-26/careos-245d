import type { ActivityEntry } from '@/lib/activity-feed'

const TYPE_COLORS: Record<string, { dot: string; line: string; bg: string }> = {
  signature:     { dot: 'bg-emerald-500', line: 'border-emerald-300', bg: 'bg-emerald-50' },
  form:          { dot: 'bg-blue-500',    line: 'border-blue-300',    bg: 'bg-blue-50' },
  incident:      { dot: 'bg-red-500',     line: 'border-red-300',     bg: 'bg-red-50' },
  evv:           { dot: 'bg-blue-500',  line: 'border-blue-300',  bg: 'bg-blue-50' },
  note:          { dot: 'bg-amber-500',   line: 'border-amber-300',   bg: 'bg-amber-50' },
  document:      { dot: 'bg-cyan-500',    line: 'border-cyan-300',    bg: 'bg-cyan-50' },
  message:       { dot: 'bg-indigo-500',  line: 'border-indigo-300',  bg: 'bg-indigo-50' },
  goal:          { dot: 'bg-teal-500',    line: 'border-teal-300',    bg: 'bg-teal-50' },
  goal_progress: { dot: 'bg-teal-500',    line: 'border-teal-300',    bg: 'bg-teal-50' },
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  signed_document: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  form_completed: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  shift_note_written: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  ),
  document_uploaded: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="12" y2="12"/><line x1="15" y1="15" x2="12" y2="12"/>
    </svg>
  ),
  visit_completed: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  staff_message: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
}

function formatTimestamp(ts: string) {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function getDateLabel(ts: string) {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export function ActivityTimeline({ entries, filter }: { entries: ActivityEntry[]; filter?: string[] }) {
  const filtered = filter?.length ? entries.filter((e) => filter.includes(e.type)) : entries

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B99A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <p className="text-sm font-semibold text-foreground">No activity yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Activity from all sources will appear here.</p>
      </div>
    )
  }

  const grouped: Record<string, ActivityEntry[]> = {}
  for (const entry of filtered) {
    const label = getDateLabel(entry.timestamp)
    if (!grouped[label]) grouped[label] = []
    grouped[label].push(entry)
  }

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([dateLabel, group]) => (
        <div key={dateLabel}>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-4">{dateLabel}</h3>
          <div className="relative">
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-muted" />
            <div className="space-y-3">
              {group.map((entry) => {
                const colors = TYPE_COLORS[entry.type] ?? { dot: 'bg-gray-400', line: 'border-gray-300', bg: 'bg-muted' }
                return (
                  <div key={entry.id} className="flex gap-3">
                    <div className="relative flex flex-col items-center">
                      <div className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${colors.bg} ${colors.dot} text-white ring-2 ring-white`}
                        style={{ backgroundColor: colors.dot.replace('bg-', '') === 'emerald-500' ? '#10B981' : colors.dot.replace('bg-', '') === 'blue-500' ? '#3B82F6' : colors.dot.replace('bg-', '') === 'red-500' ? '#EF4444' : colors.dot.replace('bg-', '') === 'blue-500' ? '#A855F7' : colors.dot.replace('bg-', '') === 'amber-500' ? '#F59E0B' : colors.dot.replace('bg-', '') === 'cyan-500' ? '#06B6D4' : colors.dot.replace('bg-', '') === 'indigo-500' ? '#6366F1' : '#14B8A6' }}
                      >
                        {ACTION_ICONS[entry.action] ?? (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <circle cx="12" cy="12" r="1"/>
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 pb-3">
                      <div className="care-panel rounded-xl px-4 py-3">
                        <p className="text-[12px] font-semibold text-foreground capitalize">{entry.action.replaceAll('_', ' ')}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{entry.description}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{entry.userName}</span>
                          <span className="w-1 h-1 rounded-full bg-[#CBD5E1]" />
                          <span className="text-[9px] text-muted-foreground">{formatTimestamp(entry.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
