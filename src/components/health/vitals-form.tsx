'use client'

import { useState } from 'react'
import { recordVital } from '@/lib/health/actions'
import { getVitalLabel, getVitalUnit } from '@/types/health'

const VITAL_TYPES = [
  'blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate',
  'temperature', 'respiratory_rate', 'oxygen_saturation', 'blood_glucose',
  'weight', 'height', 'bmi', 'pain_level', 'other',
] as const

export function VitalsForm({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [selectedType, setSelectedType] = useState('heart_rate')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    const form = new FormData(e.currentTarget)
    const result = await recordVital({
      clientId,
      vitalType: form.get('vital_type') as 'heart_rate',
      value: parseFloat(form.get('value') as string),
      unit: (form.get('unit') as string) || undefined,
      recordedAt: (form.get('recorded_at') as string) || undefined,
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
        className="text-xs font-semibold text-primary hover:underline"
      >
        + Record Vital
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-background border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Record Vital</p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-muted-foreground">Cancel</button>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      {success && <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">Vital recorded!</p>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Type</label>
          <select
            name="vital_type"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="care-input w-full rounded-lg border px-3 py-2 text-sm"
          >
            {VITAL_TYPES.map((vt) => (
              <option key={vt} value={vt}>{getVitalLabel(vt)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Value ({getVitalUnit(selectedType)})</label>
          <input name="value" type="number" step="any" required className="care-input w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Unit (optional)</label>
          <input name="unit" className="care-input w-full rounded-lg border px-3 py-2 text-sm" placeholder={getVitalUnit(selectedType) || 'custom'} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Date/Time</label>
          <input name="recorded_at" type="datetime-local" className="care-input w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">Notes</label>
        <textarea name="notes" rows={2} className="care-input w-full rounded-lg border px-3 py-2 text-sm" />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary text-white text-sm font-semibold py-2 hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Record Vital'}
      </button>
    </form>
  )
}
