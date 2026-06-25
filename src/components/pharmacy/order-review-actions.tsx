'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, HelpCircle } from 'lucide-react'
import { reviewMedicationOrder } from '@/lib/pharmacy/actions'

/**
 * Provider-side Approve / Reject / Request-clarification controls for a
 * pharmacy medication order. Approve converts the order into an active
 * medication + schedules (handled server-side).
 */
export function OrderReviewActions({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'reject' | 'clarify' | null>(null)
  const [note, setNote] = useState('')

  async function run(decision: 'approve' | 'reject' | 'clarify', noteText?: string) {
    setBusy(true)
    setError(null)
    const res = await reviewMedicationOrder(orderId, decision, noteText)
    setBusy(false)
    if (res.error) { setError(res.error); return }
    setMode(null)
    setNote('')
    router.refresh()
  }

  if (mode) {
    return (
      <div className="mt-3 space-y-2">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder={mode === 'reject' ? 'Reason for rejection (optional)' : 'What needs clarification?'}
          className="w-full rounded-lg border border-input bg-card px-3 py-2 text-[13px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/15"
        />
        {error && <p className="rounded-lg bg-status-error-bg px-3 py-2 text-[12px] text-status-error">{error}</p>}
        <div className="flex gap-2">
          <button onClick={() => { setMode(null); setError(null) }} className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold text-foreground hover:bg-muted">Cancel</button>
          <button
            onClick={() => run(mode, note)}
            disabled={busy}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-60 ${mode === 'reject' ? 'bg-status-error' : 'bg-status-warn'}`}
          >
            {busy ? '…' : mode === 'reject' ? 'Confirm reject' : 'Send clarification'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button onClick={() => run('approve')} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-brand-from to-brand-to px-3 py-1.5 text-[12px] font-bold text-white hover:opacity-90 disabled:opacity-60">
        <Check className="h-3.5 w-3.5" /> {busy ? 'Working…' : 'Approve'}
      </button>
      <button onClick={() => setMode('clarify')} disabled={busy} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold text-foreground hover:bg-muted">
        <HelpCircle className="h-3.5 w-3.5" /> Clarify
      </button>
      <button onClick={() => setMode('reject')} disabled={busy} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold text-status-error hover:bg-status-error-bg">
        <X className="h-3.5 w-3.5" /> Reject
      </button>
      {error && <p className="w-full rounded-lg bg-status-error-bg px-3 py-2 text-[12px] text-status-error">{error}</p>}
    </div>
  )
}
