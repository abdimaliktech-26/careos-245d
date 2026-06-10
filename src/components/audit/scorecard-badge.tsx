type ScorecardBadgeProps = {
  score: number
  health: 'good' | 'attention' | 'critical'
  size?: 'sm' | 'md' | 'lg'
}

const HEALTH_STYLES = {
  good: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: 'Good' },
  attention: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', label: 'Needs Attention' },
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', label: 'Critical' },
}

const SIZE_STYLES = {
  sm: { wrapper: 'px-2.5 py-1', text: 'text-[10px]', score: 'text-sm' },
  md: { wrapper: 'px-3 py-1.5', text: 'text-xs', score: 'text-lg' },
  lg: { wrapper: 'px-4 py-2', text: 'text-sm', score: 'text-2xl' },
}

export function ScorecardBadge({ score, health, size = 'md' }: ScorecardBadgeProps) {
  const style = HEALTH_STYLES[health]
  const s = SIZE_STYLES[size]

  return (
    <div className={`inline-flex items-center gap-3 rounded-xl border ${style.bg} ${style.border} ${s.wrapper}`}>
      <div className="text-center">
        <p className={`font-black tracking-tight ${s.score} ${style.text}`}>{score}</p>
        <p className={`font-bold uppercase tracking-wider ${s.text} ${style.text}`}>Score</p>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${style.dot}`} />
        <span className={`font-semibold ${s.text} ${style.text}`}>{style.label}</span>
      </div>
    </div>
  )
}

export function ScoreGauge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const circumference = 2 * Math.PI * 36
  const _offset = circumference - (score / 100) * circumference
  const color = score >= 80 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444'

  const dims = size === 'sm' ? 60 : size === 'lg' ? 100 : 80
  const strokeW = size === 'sm' ? 4 : size === 'lg' ? 7 : 5
  const r = (dims - strokeW) / 2
  const circ = 2 * Math.PI * r
  const off = circ - (score / 100) * circ

  return (
    <svg width={dims} height={dims} viewBox={`0 0 ${dims} ${dims}`} className="shrink-0">
      <circle cx={dims / 2} cy={dims / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={strokeW} />
      <circle
        cx={dims / 2} cy={dims / 2} r={r}
        fill="none" stroke={color} strokeWidth={strokeW}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={off}
        transform={`rotate(-90 ${dims / 2} ${dims / 2})`}
        className="transition-all duration-700"
      />
      <text x={dims / 2} y={dims / 2} textAnchor="middle" dominantBaseline="central"
        className={`font-black ${size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-lg' : 'text-sm'}`}
        fill={color}
      >
        {score}
      </text>
    </svg>
  )
}
