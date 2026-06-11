'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; payload: { total: number; completed: number } }>; label?: string }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-lg text-xs space-y-1">
      <p className="font-bold text-foreground">{label}</p>
      <p className="text-primary">Score: <span className="font-bold">{p.value}%</span></p>
      <p className="text-muted-foreground">Completed: {p.payload.completed} / {p.payload.total}</p>
    </div>
  )
}

export function ComplianceTrendChart({ range = 30 }: { range?: number }) {
  const router = useRouter()
  const [data, setData] = useState<Array<{ label: string; score: number; total: number; completed: number }>>([])

  useEffect(() => {
    fetch(`/api/analytics/trends?range=${range}`)
      .then(r => r.json())
      .then(d => setData(d.complianceTrend ?? []))
      .catch(() => {})
  }, [range])

  const handleClick = useCallback((point: Record<string, unknown>) => {
    const label = point?.activeLabel
    if (label) {
      router.push(`/analytics?range=${range}`)
    }
  }, [router, range])

  if (data.length === 0) {
    return <div className="h-64 flex items-center justify-center"><p className="text-sm text-muted-foreground">Loading...</p></div>
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={256}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} onClick={handleClick}>
          <defs>
            <linearGradient id="complianceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--care-primary)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--care-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--care-line)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--care-muted)' }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--care-muted)' }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="score"
            stroke="var(--care-primary)"
            strokeWidth={2}
            fill="url(#complianceGradient)"
            dot={{ r: 3, fill: 'var(--care-primary)', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6, cursor: 'pointer' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
