'use client'

import { useActionState } from 'react'
import { updateIncidentStatus } from '@/lib/incidents/actions'

export function IncidentStatusForm({ incidentId, status }: { incidentId: string; status: string }) {
  const [state, action, isPending] = useActionState(
    updateIncidentStatus as (state: { error: string | null; success: string | null }, payload: FormData) => Promise<{ error: string | null; success: string | null }>,
    { error: null, success: null }
  )

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="incidentId" value={incidentId} />
      <select name="status" defaultValue={status} className="rounded-lg border border-[#eadfd6] bg-card px-2 py-1.5 text-xs font-semibold text-[#24343a]">
        <option value="open">Open</option>
        <option value="under_review">Under Review</option>
        <option value="reported_to_state">Reported to State</option>
        <option value="closed">Closed</option>
      </select>
      <button type="submit" disabled={isPending} className="rounded-lg bg-[#24343a] px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50">
        Save
      </button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  )
}
