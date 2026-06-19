'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addRisk, removeRisk } from '@/lib/isp/actions'
import type { PlanRisk } from '@/lib/isp/types'

export function RisksEditor({ planId, clientId, risks }: { planId: string; clientId: string; risks: PlanRisk[] }) {
  const router = useRouter(); const [err, setErr] = useState('')
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3 text-[14px] font-semibold text-foreground">Risk management</h2>
      <ul className="mb-3 space-y-2">
        {risks.map((r) => (
          <li key={r.id} className="flex items-center justify-between text-[13px]">
            <span>[{r.severity ?? '—'}] {r.risk}{r.mitigation ? ` → ${r.mitigation}` : ''}</span>
            <button onClick={async () => { const res = await removeRisk(r.id, planId, clientId); if (res.error) setErr(res.error); else router.refresh() }} className="text-[12px] text-status-error">Remove</button>
          </li>
        ))}
      </ul>
      <form action={async (fd: FormData) => {
        const res = await addRisk(planId, clientId, { risk: String(fd.get('risk') || ''), mitigation: String(fd.get('mitigation') || ''), severity: String(fd.get('severity') || 'medium') })
        if (res.error) setErr(res.error); else router.refresh()
      }} className="flex gap-2">
        <input name="risk" required placeholder="Risk" className="flex-1 rounded-lg border border-input bg-card px-3 py-1.5 text-[13px]" />
        <input name="mitigation" placeholder="Mitigation" className="flex-1 rounded-lg border border-input bg-card px-3 py-1.5 text-[13px]" />
        <select name="severity" defaultValue="medium" className="rounded-lg border border-input bg-card px-2 py-1.5 text-[13px]">
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
        </select>
        <button className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold">Add</button>
      </form>
      {err && <p className="mt-2 text-[12px] text-status-error">{err}</p>}
    </section>
  )
}
