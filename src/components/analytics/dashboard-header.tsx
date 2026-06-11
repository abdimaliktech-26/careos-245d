'use client'

import { useRouter } from 'next/navigation'

export function DashboardHeader({ range = '30' }: { range?: string }) {
  const router = useRouter()

  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics &amp; BI</h1>
        <p className="text-muted-foreground mt-1">Compliance trends, performance metrics, and business intelligence.</p>
      </div>
      <select
        value={range}
        onChange={e => router.push(`?range=${e.target.value}`)}
        className="care-input rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground bg-card cursor-pointer"
      >
        <option value="30">Last 30 days</option>
        <option value="60">Last 60 days</option>
        <option value="90">Last 90 days</option>
      </select>
    </div>
  )
}
