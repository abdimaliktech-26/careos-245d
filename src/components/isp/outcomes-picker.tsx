'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { linkOutcome, unlinkOutcome } from '@/lib/isp/actions'

type GoalOption = { id: string; title: string }
type Linked = { id: string; goal_id: string }

export function OutcomesPicker({ planId, clientId, goals, linked }: { planId: string; clientId: string; goals: GoalOption[]; linked: Linked[] }) {
  const router = useRouter(); const [err, setErr] = useState('')
  const linkedIds = new Set(linked.map((l) => l.goal_id))
  const available = goals.filter((g) => !linkedIds.has(g.id))
  const titleFor = (goalId: string) => goals.find((g) => g.id === goalId)?.title ?? 'Goal'

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3 text-[14px] font-semibold text-foreground">Outcomes (goals)</h2>
      <ul className="mb-3 space-y-2">
        {linked.map((l) => (
          <li key={l.id} className="flex items-center justify-between text-[13px]">
            <span>{titleFor(l.goal_id)}</span>
            <button onClick={async () => { const r = await unlinkOutcome(l.id, planId, clientId); if (r.error) setErr(r.error); else router.refresh() }} className="text-[12px] text-status-error">Remove</button>
          </li>
        ))}
        {linked.length === 0 && <li className="text-[12px] text-muted-foreground">No outcomes linked yet.</li>}
      </ul>
      {available.length > 0 ? (
        <form action={async (fd: FormData) => {
          const goalId = String(fd.get('goalId') || '')
          if (!goalId) return
          const r = await linkOutcome(planId, clientId, goalId); if (r.error) setErr(r.error); else router.refresh()
        }} className="flex gap-2">
          <select name="goalId" className="flex-1 rounded-lg border border-input bg-card px-3 py-1.5 text-[13px]">
            <option value="">Select a goal…</option>
            {available.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
          <button className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold">Link</button>
        </form>
      ) : (
        <p className="text-[12px] text-muted-foreground">All client goals are linked (or none exist — add goals on the Goals tab).</p>
      )}
      {err && <p className="mt-2 text-[12px] text-status-error">{err}</p>}
    </section>
  )
}
