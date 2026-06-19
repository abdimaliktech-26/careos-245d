'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPlan } from '@/lib/isp/actions'

export function PlanForm({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="space-y-4"
      action={async (fd: FormData) => {
        setBusy(true); setErr('')
        const res = await createPlan({
          clientId,
          planType: String(fd.get('planType') || 'CSSP'),
          assessedNeeds: String(fd.get('assessedNeeds') || ''),
          summary: String(fd.get('summary') || ''),
          effectiveDate: String(fd.get('effectiveDate') || ''),
          reviewDate: String(fd.get('reviewDate') || ''),
          annualReviewDate: String(fd.get('annualReviewDate') || ''),
        })
        setBusy(false)
        if (!res.data) { setErr(res.error ?? 'Failed to create plan'); return }
        router.push(`/clients/${clientId}/isp/${res.data.id}`); router.refresh()
      }}
    >
      <input name="planType" defaultValue="CSSP" className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm" placeholder="Plan type" />
      <textarea name="assessedNeeds" className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm" placeholder="Assessed needs" rows={4} />
      <textarea name="summary" className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm" placeholder="Summary" rows={3} />
      <div className="grid grid-cols-3 gap-3">
        <label className="text-[12px] text-muted-foreground">Effective<input type="date" name="effectiveDate" className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm" /></label>
        <label className="text-[12px] text-muted-foreground">Review<input type="date" name="reviewDate" className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm" /></label>
        <label className="text-[12px] text-muted-foreground">Annual review<input type="date" name="annualReviewDate" className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm" /></label>
      </div>
      {err && <p className="text-[12px] text-status-error">{err}</p>}
      <button type="submit" disabled={busy} className="rounded-xl bg-primary px-5 py-2.5 text-[13px] font-bold text-primary-foreground disabled:opacity-60">{busy ? 'Creating…' : 'Create plan'}</button>
    </form>
  )
}
