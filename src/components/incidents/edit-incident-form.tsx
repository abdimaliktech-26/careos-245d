'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { updateIncident } from '@/lib/incidents/actions'
import type { IncidentCategory, IncidentStatus } from '@/types/incidents'

const CATEGORIES: [IncidentCategory, string][] = [
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

const STATUSES: [IncidentStatus, string][] = [
  ['open', 'Open'],
  ['under_review', 'Under Review'],
  ['reported_to_state', 'Reported to State'],
  ['closed', 'Closed'],
]

type EditIncidentFormProps = {
  incident: Record<string, unknown>
  staff: Array<{ id: string; full_name: string }>
  clients: Array<{ id: string; legal_name: string }>
}

export function EditIncidentForm({ incident, staff, clients }: EditIncidentFormProps) {
  const router = useRouter()
  const [state, action, isPending] = useActionState(
    updateIncident as (state: { error: string | null; success?: boolean }, payload: FormData) => Promise<{ error: string | null; success?: boolean }>,
    { error: null, success: false }
  )

  if (state.success) router.push(`/incidents/${incident.id}`)

  return (
    <form action={action} className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <input type="hidden" name="incidentId" value={incident.id as string} />

      {state?.error && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div>
        <label className="text-xs font-medium text-gray-700">Client</label>
        <select name="clientId" defaultValue={incident.client_id as string ?? ''} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
          <option value="">Select client...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.legal_name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-700">Category</label>
          <select name="category" defaultValue={incident.category as string} required className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
            {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700">Status</label>
          <select name="status" defaultValue={incident.status as string} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
            {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-700">Occurred At</label>
        <input type="datetime-local" name="occurredAt" defaultValue={(incident.occurred_at as string ?? '').slice(0, 16)} required className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-700">Location</label>
        <input type="text" name="location" defaultValue={incident.location as string ?? ''} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-700">Description</label>
        <textarea name="description" defaultValue={incident.description as string} required rows={4} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none" />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-700">Immediate Actions Taken</label>
        <textarea name="immediateActions" defaultValue={incident.immediate_actions as string ?? ''} rows={3} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none" />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-700">Staff Involved</label>
        <select name="staffInvolved" multiple defaultValue={(incident.staff_involved as string[]) ?? []} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm h-24">
          {staff.map((s) => (
            <option key={s.id} value={s.id}>{s.full_name}</option>
          ))}
        </select>
      </div>

      <fieldset className="space-y-3 rounded-xl border border-gray-100 p-4">
        <legend className="text-xs font-semibold text-gray-500 px-1">Notifications</legend>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="guardianNotified" value="true" defaultChecked={!!incident.guardian_notified} className="rounded border-gray-300 text-[#E8799E]" />
            <span className="text-xs text-gray-600">Guardian Notified</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="caseManagerNotified" value="true" defaultChecked={!!incident.case_manager_notified} className="rounded border-gray-300 text-[#E8799E]" />
            <span className="text-xs text-gray-600">Case Manager Notified</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="dhsReported" value="true" defaultChecked={!!incident.dhs_reported} className="rounded border-gray-300 text-[#E8799E]" />
            <span className="text-xs text-gray-600">DHS/State Reported</span>
          </label>
          <div>
            <label className="text-xs text-gray-600">DHS Report #</label>
            <input type="text" name="dhsReportNumber" defaultValue={incident.dhs_report_number as string ?? ''} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-1.5 text-sm" />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-gray-100 p-4">
        <legend className="text-xs font-semibold text-gray-500 px-1">Follow-Up</legend>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="followUpRequired" value="true" defaultChecked={!!incident.follow_up_required} className="rounded border-gray-300 text-[#E8799E]" />
          <span className="text-xs text-gray-600">Follow-Up Required</span>
        </label>
        <div>
          <label className="text-xs text-gray-600">Follow-Up Due Date</label>
          <input type="date" name="followUpDueDate" defaultValue={(incident.follow_up_due_date as string ?? '').slice(0, 10)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-600">Follow-Up Notes</label>
          <textarea name="followUpNotes" defaultValue={incident.follow_up_notes as string ?? ''} rows={2} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-1.5 text-sm resize-none" />
        </div>
      </fieldset>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => router.back()} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50">
          Cancel
        </button>
        <button type="submit" disabled={isPending} className="rounded-lg bg-[#E8799E] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40">
          {isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
