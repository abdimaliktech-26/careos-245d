'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function EvvPageClient({ startDate: initialStart, endDate: initialEnd }: { startDate: string; endDate: string }) {
  const router = useRouter()
  const [startDate, setStartDate] = useState(initialStart)
  const [endDate, setEndDate] = useState(initialEnd)

  const handleFilter = () => {
    const params = new URLSearchParams()
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    router.push(`/evv?${params.toString()}`)
  }

  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">From</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="care-input rounded-xl border px-3 py-1.5 text-sm"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">To</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="care-input rounded-xl border px-3 py-1.5 text-sm"
        />
      </div>
      <button
        onClick={handleFilter}
        className="rounded-xl bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition"
      >
        Apply
      </button>
    </div>
  )
}
