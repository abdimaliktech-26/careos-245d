'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signPlan } from '@/lib/isp/actions'
import type { PlanSignature } from '@/lib/isp/types'

export function SignaturesPanel({ planId, clientId, signatures }: { planId: string; clientId: string; signatures: PlanSignature[] }) {
  const router = useRouter(); const [err, setErr] = useState('')
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3 text-[14px] font-semibold text-foreground">Signatures</h2>
      <ul className="mb-3 space-y-2">
        {signatures.map((s) => (
          <li key={s.id} className="text-[13px]">
            <span className="font-semibold">{s.signer_name}</span> ({s.signer_role}) — {new Date(s.signed_at).toLocaleString()}
          </li>
        ))}
        {signatures.length === 0 && <li className="text-[12px] text-muted-foreground">No signatures yet.</li>}
      </ul>
      <form action={async (fd: FormData) => {
        const r = await signPlan(planId, clientId, {
          signerRole: String(fd.get('signerRole') || 'staff'),
          signerName: String(fd.get('signerName') || ''),
          signatureData: String(fd.get('signerName') || ''),
        })
        if (r.error) setErr(r.error); else router.refresh()
      }} className="flex gap-2">
        <select name="signerRole" defaultValue="case_manager" className="rounded-lg border border-input bg-card px-2 py-1.5 text-[13px]">
          <option value="client">client</option>
          <option value="guardian">guardian</option>
          <option value="case_manager">case manager</option>
          <option value="staff">staff</option>
        </select>
        <input name="signerName" required placeholder="Full name (typed signature)" className="flex-1 rounded-lg border border-input bg-card px-3 py-1.5 text-[13px]" />
        <button className="rounded-lg bg-primary px-3 py-1.5 text-[12px] font-bold text-primary-foreground">Sign</button>
      </form>
      {err && <p className="mt-2 text-[12px] text-status-error">{err}</p>}
    </section>
  )
}
