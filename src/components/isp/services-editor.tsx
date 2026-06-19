'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addService, removeService } from '@/lib/isp/actions'
import type { PlanService } from '@/lib/isp/types'

export function ServicesEditor({ planId, clientId, services }: { planId: string; clientId: string; services: PlanService[] }) {
  const router = useRouter(); const [err, setErr] = useState('')
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3 text-[14px] font-semibold text-foreground">Services</h2>
      <ul className="mb-3 space-y-2">
        {services.map((s) => (
          <li key={s.id} className="flex items-center justify-between text-[13px]">
            <span>{s.service_name} · {s.frequency ?? '—'} · {s.responsible_party ?? '—'}</span>
            <button onClick={async () => { const r = await removeService(s.id, planId, clientId); if (r.error) setErr(r.error); else router.refresh() }} className="text-[12px] text-status-error">Remove</button>
          </li>
        ))}
      </ul>
      <form action={async (fd: FormData) => {
        const r = await addService(planId, clientId, { serviceName: String(fd.get('serviceName') || ''), frequency: String(fd.get('frequency') || ''), responsibleParty: String(fd.get('responsibleParty') || '') })
        if (r.error) setErr(r.error); else router.refresh()
      }} className="flex gap-2">
        <input name="serviceName" required placeholder="Service" className="flex-1 rounded-lg border border-input bg-card px-3 py-1.5 text-[13px]" />
        <input name="frequency" placeholder="Frequency" className="w-28 rounded-lg border border-input bg-card px-3 py-1.5 text-[13px]" />
        <input name="responsibleParty" placeholder="Responsible" className="w-32 rounded-lg border border-input bg-card px-3 py-1.5 text-[13px]" />
        <button className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold">Add</button>
      </form>
      {err && <p className="mt-2 text-[12px] text-status-error">{err}</p>}
    </section>
  )
}
