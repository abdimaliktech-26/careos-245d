import type { Vital } from '@/types/health'

export function VitalTrend({ vitals, color = '#10B99A' }: { vitals: Vital[]; color?: string }) {
  if (vitals.length < 2) return null

  const sorted = [...vitals].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  )
  const values = sorted.map((v) => v.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const width = 120
  const height = 40
  const padding = 2
  const plotW = width - padding * 2
  const plotH = height - padding * 2

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * plotW
    const y = padding + plotH - ((v - min) / range) * plotH
    return `${x},${y}`
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p}`).join(' ')

  return (
    <svg width={width} height={height} className="shrink-0">
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].split(',')[0]} cy={points[points.length - 1].split(',')[1]} r="2" fill={color} />
    </svg>
  )
}
