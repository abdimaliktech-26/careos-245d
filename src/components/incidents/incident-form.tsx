'use client'

import { useActionState } from 'react'
import { createIncident } from '@/lib/incidents/actions'

type ClientOption = {
  id: string
  legal_name: string
}

const CATEGORIES = [
  ['injury', 'Injury'],
  ['medication_error', 'Medication Error'],
  ['behavioral_incident', 'Behavioral Incident'],
  ['emergency_manual_restraint', 'Emergency Manual Restraint'],
  ['maltreatment_concern', 'Maltreatment Concern'],
  ['death', 'Death'],
  ['property_damage', 'Property Damage'],
  ['elopement', 'Elopement'],
  ['other', 'Other'],
]

export function IncidentForm({ clients }: { clients: ClientOption[] }) {
  const [state, action, isPending] = useActionState(
    createIncident as (state: { error: string | null; success: string | null }, payload: FormData) => Promise<{ error: string | null; success: string | null }>,
    { error: null, success: null }
  )

  return (
    <form action={action} className="care-panel rounded-2xl p-6 space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B4B2D]">New Report</p>
        <h2 className="mt-1 text-xl font-black text-[#24343a]">Document Incident</h2>
      </div>

      {state.error && <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.success && <p className="rounded-xl border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p>}

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">Client</span>
        <select name="clientId" className="care-input mt-1 w-full rounded-xl border px-3 py-2.5 text-sm">
          <option value="">No client selected</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>{client.legal_name}</option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">Category</span>
          <select name="category" required className="care-input mt-1 w-full rounded-xl border px-3 py-2.5 text-sm">
            {CATEGORIES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">Occurred At</span>
          <input name="occurredAt" type="datetime-local" required className="care-input mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">Location</span>
        <input name="location" className="care-input mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" placeholder="Home, community site, vehicle, etc." />
      </label>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">Description</span>
        <textarea name="description" required rows={4} className="care-input mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" />
      </label>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">Immediate Actions</span>
        <textarea name="immediateActions" rows={3} className="care-input mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ['guardianNotified', 'Guardian notified'],
          ['caseManagerNotified', 'Case manager notified'],
          ['dhsReported', 'DHS/state reported'],
          ['followUpRequired', 'Follow-up required'],
        ].map(([name, label]) => (
          <label key={name} className="flex items-center gap-2 rounded-xl border border-[#eadfd6] bg-white px-3 py-2 text-sm font-semibold text-[#24343a]">
            <input name={name} type="checkbox" className="size-4 accent-[#f37d6d]" />
            {label}
          </label>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">Follow-up Due</span>
          <input name="followUpDueDate" type="date" className="care-input mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">Follow-up Notes</span>
          <input name="followUpNotes" className="care-input mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" />
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-[#f37d6d] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Saving...' : 'Save Incident'}
      </button>
    </form>
  )
}
