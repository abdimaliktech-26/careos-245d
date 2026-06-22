'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'
import { updateCapStatus, generateCapsForReview } from '@/lib/audit-readiness/actions'

type CapStatus = 'open' | 'in_progress' | 'complete'

const STATUS_STYLES: Record<CapStatus, string> = {
  open: 'bg-status-error-bg text-status-error',
  in_progress: 'bg-status-warn-bg text-status-warn',
  complete: 'bg-status-ok-bg text-status-ok',
}

export function CapStatusSelect({ capId, status }: { capId: string; status: CapStatus }) {
  const router = useRouter()
  const [value, setValue] = useState<CapStatus>(status)
  const [pending, startTransition] = useTransition()

  const onChange = (next: CapStatus) => {
    setValue(next)
    startTransition(async () => {
      await updateCapStatus(capId, next)
      router.refresh()
    })
  }

  return (
    <div className="inline-flex items-center gap-2">
      <select
        value={value}
        disabled={pending}
        onChange={(e) => onChange(e.target.value as CapStatus)}
        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold outline-none ${STATUS_STYLES[value]}`}
      >
        <option value="open">Open</option>
        <option value="in_progress">In Progress</option>
        <option value="complete">Complete</option>
      </select>
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
    </div>
  )
}

export function GenerateCapsButton({ reviewId }: { reviewId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  const generate = () => {
    setMsg(null)
    startTransition(async () => {
      const res = await generateCapsForReview(reviewId)
      if (res.error) { setMsg(res.error); return }
      setMsg(res.data ? `Generated ${res.data.count} action${res.data.count !== 1 ? 's' : ''}${res.data.aiUsed ? ' (AI)' : ''}.` : null)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-[12px] text-muted-foreground">{msg}</span>}
      <button
        type="button"
        onClick={generate}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-brand-from to-brand-to px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-[14px] w-[14px]" />}
        Generate Action Plan
      </button>
    </div>
  )
}
