'use client'

import { useState, useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { syncVisitsFromSchedule } from '@/lib/evv/workflow-actions'

type EvvSyncButtonProps = {
  startDate: string
  endDate: string
}

/** Generates EVV visits for scheduled shifts that don't have one yet. */
export function EvvSyncButton({ startDate, endDate }: EvvSyncButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSync = () => {
    setMessage(null)
    setError(null)
    startTransition(async () => {
      const result = await syncVisitsFromSchedule(startDate, endDate)
      if (result.error) setError(result.error)
      else {
        setMessage(result.success ?? 'Synced.')
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleSync}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
        {isPending ? 'Syncing…' : 'Generate visits from schedule'}
      </button>
      {message && <span className="text-[11px] text-emerald-600">{message}</span>}
      {error && <span className="text-[11px] text-amber-600">{error}</span>}
    </div>
  )
}
