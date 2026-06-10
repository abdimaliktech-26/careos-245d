'use client'

import { useState } from 'react'
import { addCondition } from '@/lib/health/actions'

export function ConditionForm({ clientId, onClose }: { clientId: string; onClose: () => void }) {
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
    const result = await addCondition({
      clientId,
      conditionName: form.get('condition_name') as string,
      diagnosisDate: (form.get('diagnosis_date') as string) || undefined,
      isChronic: form.has('is_chronic'),
      severity: (form.get('severity') as 'mild' | 'moderate' | 'severe') || undefined,
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
        + Add Condition
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#F8FAFC] border border-gray-200 rounded-xl p-4 space-y-3 mt-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#3A2A4A]">New Condition</p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      {success && <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">Condition added!</p>}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-medium text-[#64748B] block mb-1">Condition Name</label>
          <input name="condition_name" required className="care-input w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-[#64748B] block mb-1">Diagnosis Date</label>
          <input name="diagnosis_date" type="date" className="care-input w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-[#64748B] block mb-1">Severity</label>
          <select name="severity" className="care-input w-full rounded-lg border px-3 py-2 text-sm">
            <option value="">Not specified</option>
            <option value="mild">Mild</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input name="is_chronic" type="checkbox" className="rounded border-gray-300" />
        <label className="text-xs text-[#64748B]">Chronic condition</label>
      </div>

      <div>
        <label className="text-xs font-medium text-[#64748B] block mb-1">Notes</label>
        <textarea name="notes" rows={2} className="care-input w-full rounded-lg border px-3 py-2 text-sm" />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[#E8799E] text-white text-sm font-semibold py-2 hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Add Condition'}
      </button>
    </form>
  )
}
