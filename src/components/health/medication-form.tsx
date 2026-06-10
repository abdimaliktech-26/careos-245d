'use client'

import { useState } from 'react'
import { addMedication } from '@/lib/health/actions'

const ROUTES = [
  { value: 'oral', label: 'Oral' },
  { value: 'topical', label: 'Topical' },
  { value: 'injection', label: 'Injection' },
  { value: 'inhalation', label: 'Inhalation' },
  { value: 'sublingual', label: 'Sublingual' },
  { value: 'rectal', label: 'Rectal' },
  { value: 'ophthalmic', label: 'Ophthalmic' },
  { value: 'otic', label: 'Otic' },
  { value: 'other', label: 'Other' },
]

const FREQUENCIES = [
  { value: 'once_daily', label: 'Once Daily' },
  { value: 'twice_daily', label: 'Twice Daily' },
  { value: 'three_times_daily', label: 'Three Times Daily' },
  { value: 'four_times_daily', label: 'Four Times Daily' },
  { value: 'every_4_hours', label: 'Every 4 Hours' },
  { value: 'every_6_hours', label: 'Every 6 Hours' },
  { value: 'every_8_hours', label: 'Every 8 Hours' },
  { value: 'every_12_hours', label: 'Every 12 Hours' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'as_needed', label: 'As Needed' },
  { value: 'other', label: 'Other' },
]

export function MedicationForm({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    const form = new FormData(e.currentTarget)
    const result = await addMedication({
      clientId,
      medicationName: form.get('medication_name') as string,
      dosage: form.get('dosage') as string,
      route: form.get('route') as 'oral',
      frequency: form.get('frequency') as 'once_daily',
      prescribedBy: (form.get('prescribed_by') as string) || undefined,
      prescribingPhysician: (form.get('prescribing_physician') as string) || undefined,
      pharmacyName: (form.get('pharmacy_name') as string) || undefined,
      pharmacyPhone: (form.get('pharmacy_phone') as string) || undefined,
      startDate: form.get('start_date') as string,
      endDate: (form.get('end_date') as string) || undefined,
      isActive: form.has('is_active'),
      notes: (form.get('notes') as string) || undefined,
    })

    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      e.currentTarget.reset()
      setTimeout(() => { setOpen(false); onClose() }, 800)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-[#E8799E] hover:underline"
      >
        + Add Medication
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#F8FAFC] border border-gray-200 rounded-xl p-4 space-y-3 mt-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#3A2A4A]">New Medication</p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      {success && <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">Medication added!</p>}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-medium text-[#64748B] block mb-1">Medication Name</label>
          <input name="medication_name" required className="care-input w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-[#64748B] block mb-1">Dosage</label>
          <input name="dosage" required placeholder="e.g. 10mg" className="care-input w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-[#64748B] block mb-1">Route</label>
          <select name="route" className="care-input w-full rounded-lg border px-3 py-2 text-sm">
            {ROUTES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-[#64748B] block mb-1">Frequency</label>
          <select name="frequency" className="care-input w-full rounded-lg border px-3 py-2 text-sm">
            {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-[#64748B] block mb-1">Start Date</label>
          <input name="start_date" type="date" required className="care-input w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-[#64748B] block mb-1">End Date</label>
          <input name="end_date" type="date" className="care-input w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-[#64748B] block mb-1">Prescribed By</label>
          <input name="prescribed_by" className="care-input w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-[#64748B] block mb-1">Prescribing Physician</label>
          <input name="prescribing_physician" className="care-input w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-[#64748B] block mb-1">Pharmacy Name</label>
          <input name="pharmacy_name" className="care-input w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-[#64748B] block mb-1">Pharmacy Phone</label>
          <input name="pharmacy_phone" type="tel" className="care-input w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-[#64748B] block mb-1">Notes</label>
        <textarea name="notes" rows={2} className="care-input w-full rounded-lg border px-3 py-2 text-sm" />
      </div>

      <div className="flex items-center gap-2">
        <input name="is_active" type="checkbox" defaultChecked className="rounded border-gray-300" />
        <label className="text-xs text-[#64748B]">Active</label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[#E8799E] text-white text-sm font-semibold py-2 hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Add Medication'}
      </button>
    </form>
  )
}
