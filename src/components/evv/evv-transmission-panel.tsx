'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'
import { requeueTransmission } from '@/lib/evv/aggregator/actions'

export type TransmissionRowView = {
  visitId: string
  clientName: string
  serviceDate: string
  status: 'queued' | 'sending' | 'accepted' | 'rejected' | 'failed'
  lastError: string | null
  externalId: string | null
}

export type TransmissionSummaryView = {
  queued: number
  sending: number
  accepted: number
  rejected: number
  failed: number
}

type EvvTransmissionPanelProps = {
  summary: TransmissionSummaryView
  rows: TransmissionRowView[]
  canRequeue: boolean
}

const STATUS_STYLES: Record<TransmissionRowView['status'], string> = {
  queued: 'bg-muted text-muted-foreground',
  sending: 'bg-blue-50 text-blue-700',
  accepted: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-status-error-bg text-status-error',
  failed: 'bg-status-error-bg text-status-error',
}

const STAT_TILES: Array<{ key: keyof TransmissionSummaryView; label: string }> = [
  { key: 'accepted', label: 'Accepted' },
  { key: 'queued', label: 'Queued' },
  { key: 'sending', label: 'Sending' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'failed', label: 'Failed' },
]

export function EvvTransmissionPanel({ summary, rows, canRequeue }: EvvTransmissionPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleRequeue = (visitId: string) => {
    setError(null)
    startTransition(async () => {
      const result = await requeueTransmission(visitId)
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  const needsAttention = rows.filter((r) => r.status === 'rejected' || r.status === 'failed')

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          State Aggregator Transmissions
        </p>
        <a href="/evv/settings" className="text-[11px] font-semibold text-primary hover:underline">
          Configure
        </a>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-2">
        {STAT_TILES.map((tile) => (
          <div key={tile.key} className="rounded-xl border border-border px-3 py-2 text-center">
            <p className="text-lg font-bold text-foreground">{summary[tile.key]}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{tile.label}</p>
          </div>
        ))}
      </div>

      {needsAttention.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-semibold text-status-error">Needs attention ({needsAttention.length})</p>
          {needsAttention.slice(0, 8).map((row) => (
            <div key={row.visitId} className="flex flex-wrap items-center gap-2 rounded-xl border border-border px-3 py-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[row.status]}`}>
                {row.status}
              </span>
              <span className="text-[12px] font-semibold text-foreground">{row.clientName}</span>
              <span className="text-[11px] text-muted-foreground">{row.serviceDate}</span>
              {row.lastError && (
                <span className="w-full text-[11px] text-muted-foreground sm:w-auto sm:flex-1 truncate" title={row.lastError}>
                  {row.lastError}
                </span>
              )}
              {canRequeue && (
                <button
                  type="button"
                  onClick={() => handleRequeue(row.visitId)}
                  disabled={isPending}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <Send className="h-3 w-3" />
                  Re-queue
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <p className="mt-2 text-[12px] text-status-error">{error}</p>}
    </div>
  )
}
