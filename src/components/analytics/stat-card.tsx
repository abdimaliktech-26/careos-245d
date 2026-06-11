import type { ReactNode } from 'react'

export function AnalyticsStatCard({ label, value, color = 'gray' }: { label: string | ReactNode; value: string | number; color?: string }) {
  const colors: Record<string, string> = {
    gray: 'text-foreground',
    emerald: 'text-emerald-600',
    blue: 'text-primary',
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <p className={`text-2xl font-bold ${colors[color] ?? colors.gray}`}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mt-1">{label}</p>
    </div>
  )
}
