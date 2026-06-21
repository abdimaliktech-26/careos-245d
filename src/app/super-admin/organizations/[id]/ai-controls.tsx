'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setOrgAiEnabled, setOrgAiLimit } from '@/lib/ai/admin-actions'

export function AiControls({ orgId, enabled, monthlyLimit, usedThisMonth }: {
  orgId: string; enabled: boolean; monthlyLimit: number; usedThisMonth: number
}) {
  const router = useRouter()
  const [err, setErr] = useState('')

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">AI</p>
      <h2 className="mt-0.5 text-[13px] font-bold text-foreground mb-4">AI Controls</h2>

      <form
        action={async (fd: FormData) => {
          setErr('')
          const r = await setOrgAiEnabled(orgId, fd.get('enabled') === 'on')
          if (r.error) { setErr(r.error); return }
          router.refresh()
        }}
        className="mb-3 flex items-center justify-between"
      >
        <label className="flex items-center gap-2 text-[13px] text-foreground">
          <input type="checkbox" name="enabled" defaultChecked={enabled} />
          AI enabled
        </label>
        <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold hover:bg-muted">Save</button>
      </form>

      <form
        action={async (fd: FormData) => {
          setErr('')
          const r = await setOrgAiLimit(orgId, Number(fd.get('limit') || 0))
          if (r.error) { setErr(r.error); return }
          router.refresh()
        }}
        className="flex items-center gap-2"
      >
        <label className="text-[12px] text-muted-foreground">Monthly limit</label>
        <input type="number" name="limit" defaultValue={monthlyLimit} min={0} className="w-24 rounded-lg border border-input bg-card px-2 py-1 text-[13px]" />
        <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold hover:bg-muted">Save</button>
      </form>

      <p className="mt-3 text-[11px] text-muted-foreground">Used this month: {usedThisMonth} / {monthlyLimit}</p>
      {err && <p className="mt-2 text-[12px] text-status-error">{err}</p>}
    </div>
  )
}
