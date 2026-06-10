'use client'

import { useActionState } from 'react'
import { createEvvVisit } from '@/lib/evv/actions'

type ClientOption = { id: string; legal_name: string }
type StaffOption = { id: string; full_name: string }

export function EvvVisitForm({ clients, staff }: { clients: ClientOption[]; staff: StaffOption[] }) {
  const [state, action, isPending] = useActionState(
    createEvvVisit as (state: { error: string | null; success: string | null }, payload: FormData) => Promise<{ error: string | null; success: string | null }>,
    { error: null, success: null }
  )

  return (
    <form action={action} className="care-panel rounded-2xl p-6 space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B4B2D]">Visit Entry</p>
        <h2 className="mt-1 text-xl font-black text-[#24343a]">Add EVV Visit</h2>
      </div>
      {state.error && <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.success && <p className="rounded-xl border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p>}

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">Client</span>
        <select name="clientId" required className="care-input mt-1 w-full rounded-xl border px-3 py-2.5 text-sm">
          <option value="">Choose client</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.legal_name}</option>)}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">Staff</span>
        <select name="staffId" className="care-input mt-1 w-full rounded-xl border px-3 py-2.5 text-sm">
          <option value="">Unassigned</option>
          {staff.map((member) => <option key={member.id} value={member.id}>{member.full_name}</option>)}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">Service</span>
          <input name="serviceName" required className="care-input mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" placeholder="IHS support" />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">Date</span>
          <input name="serviceDate" type="date" required className="care-input mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">Scheduled Start</span>
          <input name="scheduledStart" type="time" className="care-input mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">Scheduled End</span>
          <input name="scheduledEnd" type="time" className="care-input mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">Status</span>
          <select name="status" className="care-input mt-1 w-full rounded-xl border px-3 py-2.5 text-sm">
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="missed">Missed</option>
            <option value="exception">Exception</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">Actual Start</span>
          <input name="actualStart" type="time" className="care-input mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">Actual End</span>
          <input name="actualEnd" type="time" className="care-input mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <input name="checkInMethod" className="care-input rounded-xl border px-3 py-2.5 text-sm" placeholder="Check-in method/location" />
        <input name="checkOutMethod" className="care-input rounded-xl border px-3 py-2.5 text-sm" placeholder="Check-out method/location" />
      </div>
      <textarea name="exceptionReason" rows={2} className="care-input w-full rounded-xl border px-3 py-2.5 text-sm" placeholder="Exception reason, if any" />
      <textarea name="notes" rows={2} className="care-input w-full rounded-xl border px-3 py-2.5 text-sm" placeholder="Visit notes" />

      <button type="submit" disabled={isPending} className="w-full rounded-full bg-[#f37d6d] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">
        {isPending ? 'Saving...' : 'Save EVV Visit'}
      </button>
    </form>
  )
}
