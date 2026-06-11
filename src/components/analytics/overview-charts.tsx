'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface FormsByMonth {
  month: string
  count: number
}

interface PacketStatus {
  name: string
  value: number
  color: string
}

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-lg text-xs">
      <p className="font-bold text-foreground mb-1">{label}</p>
      <p className="text-primary">{payload[0].value} forms completed</p>
    </div>
  )
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const total = (payload as any).reduce?.((s: number, p: any) => s + p.value, 0) ?? 0
  const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-lg text-xs">
      <p className="font-bold text-foreground mb-1">{entry.name}</p>
      <p className="text-muted-foreground">{entry.value} packets ({pct}%)</p>
    </div>
  )
}

export function OverviewCharts({ range = 30 }: { range?: number }) {
  const router = useRouter()
  const [formsByMonth, setFormsByMonth] = useState<FormsByMonth[]>([])
  const [packetStatus, setPacketStatus] = useState<PacketStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    fetch(`/api/analytics/overview?range=${range}`)
      .then(r => r.json())
      .then(d => {
        setFormsByMonth(d.formsByMonth ?? [])
        setPacketStatus(d.packetStatusBreakdown ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [range])

  const handleBarClick = useCallback(() => {
    router.push('/form-library')
  }, [router])

  const handlePieClick = useCallback(() => {
    router.push('/packets')
  }, [router])

  if (loading) {
    return (
      <>
        <div className="rounded-2xl border border-border bg-card p-6 h-[340px] flex items-center justify-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 h-[340px] flex items-center justify-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </>
    )
  }

  const nonZeroStatus = packetStatus.filter(s => s.value > 0)

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h3 className="text-sm font-bold text-foreground mb-4">Forms Completed by Month</h3>
        <ResponsiveContainer width="100%" height={256}>
          <BarChart data={formsByMonth} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} onClick={handleBarClick}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--care-line)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--care-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--care-muted)' }} axisLine={false} tickLine={false} />
            <Tooltip content={<BarTooltip />} />
            <Bar dataKey="count" fill="var(--care-primary)" radius={[4, 4, 0, 0]} maxBarSize={48} cursor="pointer" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h3 className="text-sm font-bold text-foreground mb-4">Packet Status Breakdown</h3>
        <div className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart onClick={handlePieClick}>
              <Pie
                data={nonZeroStatus}
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={88}
                paddingAngle={2}
                dataKey="value"
                cursor="pointer"
              >
                {nonZeroStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3 justify-center -mt-2">
          {nonZeroStatus.map(s => (
            <div key={s.name} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-[10px] text-muted-foreground">{s.name} ({s.value})</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
