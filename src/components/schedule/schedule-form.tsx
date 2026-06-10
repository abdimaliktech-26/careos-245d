'use client'

import { useActionState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createScheduleEntry, updateScheduleEntry, deleteScheduleEntry } from '@/lib/schedule/actions'
import type { RecurrencePattern } from '@/lib/schedule/recurring'

type ClientOption = { id: string; legal_name: string }

type EditEntry = {
  id: string
  client_id: string
  staff_name: string | null
  scheduled_date: string
  start_time: string
  end_time: string
  service_type: string
  status: string
  notes: string | null
}

const SERVICE_TYPES = [
  ['pca', 'PCA – Personal Care Assistance'],
  ['cdcs', 'CDCS – Consumer-Directed Community Supports'],
  ['ics', 'ICS – Individualized Community Supports'],
  ['day_services', 'Day Services'],
  ['respite', 'Respite'],
  ['transportation', 'Transportation'],
  ['hcbs_other', 'HCBS – Other'],
]

const RECURRENCE_OPTIONS: [RecurrencePattern, string][] = [
  ['none', 'One-time'],
  ['daily', 'Daily'],
  ['weekdays', 'Weekdays (Mon–Fri)'],
  ['mon_wed_fri', 'Mon / Wed / Fri'],
  ['tue_thu', 'Tue / Thu'],
  ['weekly', 'Weekly (same day)'],
]

const labelClass = 'text-xs font-semibold uppercase tracking-widest text-gray-400'
const inputClass = 'care-input mt-1 w-full rounded-xl border px-3 py-2.5 text-sm'

export function ScheduleForm({ clients, editEntry, onCancel }: { clients: ClientOption[]; editEntry?: EditEntry | null; onCancel?: () => void }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [state, action, isPending] = useActionState(
    (editEntry ? updateScheduleEntry : createScheduleEntry) as (
      state: { error: string | null; success: string | null; conflicts?: Array<{ date: string; message: string }> },
      payload: FormData
    ) => Promise<{ error: string | null; success: string | null; conflicts?: Array<{ date: string; message: string }> }>,
    { error: null, success: null }
  )

  const isEditing = !!editEntry

  const handleDelete = async () => {
    if (!editEntry) return
    if (!confirm('Delete this schedule entry? This cannot be undone.')) return
    const result = await deleteScheduleEntry(editEntry.id)
    if (!result.error) {
      onCancel?.()
      router.refresh()
    }
  }

  return (
    <form ref={formRef} action={action} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      {isEditing && <input type="hidden" name="entryId" value={editEntry.id} />}
      {!isEditing && <input type="hidden" name="createEvv" value="" />}

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#E8799E]">
          {isEditing ? 'Edit Shift' : 'New Shift'}
        </p>
        <h2 className="mt-1 text-xl font-black text-[#111827]">
          {isEditing ? 'Update Visit' : 'Schedule a Visit'}
        </h2>
      </div>

      {state.error && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded-xl border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.success}
          {isEditing && (
            <button type="button" onClick={() => { onCancel?.(); router.refresh() }} className="ml-2 underline text-green-800">Continue</button>
          )}
        </p>
      )}
      {state.conflicts && state.conflicts.length > 0 && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 space-y-1">
          <p className="text-xs font-semibold text-amber-800">Schedule Conflicts Detected:</p>
          {state.conflicts.map((c, i) => (
            <p key={i} className="text-xs text-amber-700">{c.date}: {c.message}</p>
          ))}
        </div>
      )}

      <label className="block">
        <span className={labelClass}>Client</span>
        <select name="clientId" required className={inputClass} defaultValue={editEntry?.client_id ?? ''}>
          <option value="">Select client…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.legal_name}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={labelClass}>Staff Name</span>
        <input name="staffName" className={inputClass} placeholder="Assigned staff member"
          defaultValue={editEntry?.staff_name ?? ''} />
      </label>

      <label className="block">
        <span className={labelClass}>Date</span>
        <input name="scheduledDate" type="date" required className={inputClass}
          defaultValue={editEntry?.scheduled_date ?? new Date().toISOString().slice(0, 10)} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={labelClass}>Start</span>
          <input name="startTime" type="time" required className={inputClass}
            defaultValue={editEntry?.start_time ?? ''} />
        </label>
        <label className="block">
          <span className={labelClass}>End</span>
          <input name="endTime" type="time" required className={inputClass}
            defaultValue={editEntry?.end_time ?? ''} />
        </label>
      </div>

      <label className="block">
        <span className={labelClass}>Service Type</span>
        <select name="serviceType" required className={inputClass} defaultValue={editEntry?.service_type ?? 'pca'}>
          {SERVICE_TYPES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>

      {!isEditing && (
        <>
          <label className="block">
            <span className={labelClass}>Recurrence</span>
            <select name="recurrence" className={inputClass} defaultValue="none">
              {RECURRENCE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input name="createEvv" type="checkbox" value="true" className="rounded border-gray-300 text-[#E8799E] focus:ring-[#E8799E]/20" />
            <span className="text-xs text-gray-600">Auto-create EVV visits for billing</span>
          </label>
        </>
      )}

      <label className="block">
        <span className={labelClass}>Notes</span>
        <textarea name="notes" rows={3} className={inputClass + ' resize-none'}
          placeholder="Special instructions, equipment needed, etc."
          defaultValue={editEntry?.notes ?? ''} />
      </label>

      <div className="flex gap-3">
        {isEditing && (
          <>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #E8799E 0%, #C8A8E8 100%)' }}
            >
              {isPending ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition"
            >
              Delete
            </button>
          </>
        )}
        {!isEditing && (
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #E8799E 0%, #C8A8E8 100%)' }}
          >
            {isPending ? 'Scheduling…' : 'Schedule Shift'}
          </button>
        )}
      </div>
    </form>
  )
}
