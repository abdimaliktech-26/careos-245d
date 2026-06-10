'use client'

import { useActionState } from 'react'
import { createStaffTraining } from '@/lib/staff-trainings/actions'

type StaffOption = {
  id: string
  full_name: string
}

export function TrainingForm({ staff }: { staff: StaffOption[] }) {
  const [state, action, isPending] = useActionState(
    createStaffTraining as (state: { error: string | null; success: string | null }, payload: FormData) => Promise<{ error: string | null; success: string | null }>,
    { error: null, success: null }
  )

  return (
    <form action={action} className="care-panel rounded-2xl p-6 space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B4B2D]">Credential</p>
        <h2 className="mt-1 text-xl font-black text-[#24343a]">Add Staff Training</h2>
      </div>

      {state.error && <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.success && <p className="rounded-xl border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p>}

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">Staff</span>
        <select name="staffId" required className="care-input mt-1 w-full rounded-xl border px-3 py-2.5 text-sm">
          <option value="">Choose staff</option>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>{member.full_name}</option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">Training Name</span>
          <input name="trainingName" required className="care-input mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" placeholder="245D Orientation" />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">Code</span>
          <input name="trainingCode" className="care-input mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" placeholder="ORIENT-245D" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">Completed</span>
          <input name="completedDate" type="date" className="care-input mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">Expires</span>
          <input name="expirationDate" type="date" className="care-input mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">Notes</span>
        <textarea name="notes" rows={3} className="care-input mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" />
      </label>

      <button type="submit" disabled={isPending} className="w-full rounded-full bg-[#f37d6d] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">
        {isPending ? 'Saving...' : 'Add Training'}
      </button>
    </form>
  )
}
