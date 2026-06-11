import type { GoalProgress } from '@/lib/goals/types'

type ProgressTimelineProps = {
  progress: GoalProgress[]
}

export function ProgressTimeline({ progress }: ProgressTimelineProps) {
  if (progress.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No progress recorded yet. Add your first progress entry above.
      </p>
    )
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />
      <div className="space-y-4">
        {progress.map((entry, i) => (
          <div key={entry.id} className="relative pl-10">
            <div
              className={`absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 bg-card ${
                i === 0 ? 'border-primary' : 'border-gray-300'
              }`}
            />
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.recorded_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
                {entry.progress_score !== null && (
                  <span
                    className={`text-sm font-bold ${
                      entry.progress_score >= 70
                        ? 'text-emerald-600'
                        : entry.progress_score >= 40
                        ? 'text-amber-600'
                        : 'text-red-600'
                    }`}
                  >
                    {entry.progress_score}%
                  </span>
                )}
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{entry.progress_note}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProgressChart({ progress }: { progress: GoalProgress[] }) {
  const scored = progress
    .filter((p) => p.progress_score !== null)
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())

  if (scored.length < 2) return null

  const width = 400
  const height = 160
  const padding = { top: 20, right: 20, bottom: 30, left: 40 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const scores = scored.map((s) => s.progress_score!)
  const minScore = Math.max(0, Math.min(...scores) - 10)
  const maxScore = Math.min(100, Math.max(...scores) + 10)
  const range = maxScore - minScore || 1

  const points = scored.map((s, i) => {
    const x = padding.left + (i / (scored.length - 1)) * chartW
    const y = padding.top + chartH - ((s.progress_score! - minScore) / range) * chartH
    return `${x},${y}`
  })

  const pathD = points.length > 1
    ? `M${points.join(' L')}`
    : ''

  const gridLines = [0, 25, 50, 75, 100].filter((v) => v >= minScore && v <= maxScore)

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">Progress Over Time</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ maxHeight: '180px' }}>
        {gridLines.map((line) => {
          const y = padding.top + chartH - ((line - minScore) / range) * chartH
          return (
            <g key={line}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#F1F5F9" strokeWidth={1} />
              <text x={padding.left - 4} y={y + 3} textAnchor="end" className="text-[10px]" fill="#94A3B8">
                {line}
              </text>
            </g>
          )
        })}

        {scored.map((s, i) => {
          const x = padding.left + (i / (scored.length - 1)) * chartW
          const y = padding.top + chartH - ((s.progress_score! - minScore) / range) * chartH
          const color = s.progress_score! >= 70 ? '#10B981' : s.progress_score! >= 40 ? '#F59E0B' : '#EF4444'
          return (
            <g key={s.id}>
              <circle cx={x} cy={y} r={4} fill={color} stroke="white" strokeWidth={2}>
                <title>{s.progress_score}% - {new Date(s.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</title>
              </circle>
            </g>
          )
        })}

        {pathD && (
          <path d={pathD} fill="none" stroke="#DB2777" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        )}

        {scored.map((s, i) => {
          const x = padding.left + (i / (scored.length - 1)) * chartW
          if (scored.length <= 8) {
            return (
              <text
                key={`label-${s.id}`}
                x={x}
                y={height - 5}
                textAnchor="middle"
                className="text-[9px]"
                fill="#94A3B8"
              >
                {new Date(s.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </text>
            )
          }
          return null
        })}
      </svg>
    </div>
  )
}
