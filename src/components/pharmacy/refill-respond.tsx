'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { respondToRefill } from '@/lib/pharmacy/actions'
import type { RefillStatus } from '@/types/app'

const OPTIONS: { value: RefillStatus; label: string }[] = [
  { value: 'received', label: 'Received' },
  { value: 'processing', label: 'Processing' },
  { value: 'waiting_physician', label: 'Waiting on physician' },
  { value: 'filled', label: 'Filled' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'denied', label: 'Denied' },
  { value: 'needs_clarification', label: 'Needs clarification' },
]

export function RefillRespond({ refillId, current }: { refillId: string; current: string }) {
  const router = useRouter()
  const [status, setStatus] = useState<RefillStatus>('received')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const res = await respondToRefill(refillId, status)
    setSaving(false)
    if (!res.error) router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as RefillStatus)}
        className="rounded-lg border border-input bg-card px-2 py-1.5 text-[12px] outline-none focus:border-ring"
      >
        {OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <button
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-gradient-to-br from-brand-from to-brand-to px-3 py-1.5 text-[12px] font-bold text-white hover:opacity-90 disabled:opacity-60"
      >
        {saving ? '…' : 'Update'}
      </button>
    </div>
  )
}
