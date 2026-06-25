'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { createMedication } from '@/lib/medications/actions'

const input = 'w-full rounded-lg border border-input bg-card px-3 py-2 text-[13px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/15'
const label = 'mb-1 block text-[12px] font-semibold text-foreground'

export function AddMedicationForm({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', genericName: '', dosage: '', route: '', frequency: '',
    times: '', startDate: '', endDate: '', physician: '',
    isPrn: false, isControlled: false, instructions: '',
  })

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function submit() {
    setError(null)
    if (!form.name.trim()) { setError('Medication name is required.'); return }
    setSaving(true)
    const res = await createMedication({
      clientId,
      name: form.name,
      genericName: form.genericName || undefined,
      dosage: form.dosage || undefined,
      route: form.route || undefined,
      frequency: form.frequency || undefined,
      administrationTimes: form.times.split(',').map((t) => t.trim()).filter(Boolean),
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      prescribingPhysician: form.physician || undefined,
      isPrn: form.isPrn,
      isControlled: form.isControlled,
      specialInstructions: form.instructions || undefined,
    })
    setSaving(false)
    if (res.error) { setError(res.error); return }
    setOpen(false)
    setForm({ name: '', genericName: '', dosage: '', route: '', frequency: '', times: '', startDate: '', endDate: '', physician: '', isPrn: false, isControlled: false, instructions: '' })
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-brand-from to-brand-to px-4 py-2 text-[13px] font-bold text-white hover:opacity-90"
      >
        <Plus className="h-4 w-4" /> Add medication
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-3 text-[14px] font-bold text-foreground">New medication</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className={label}>Medication name *</label><input className={input} value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
        <div><label className={label}>Generic name</label><input className={input} value={form.genericName} onChange={(e) => set('genericName', e.target.value)} /></div>
        <div><label className={label}>Dosage</label><input className={input} value={form.dosage} onChange={(e) => set('dosage', e.target.value)} placeholder="e.g. 10 mg" /></div>
        <div><label className={label}>Route</label><input className={input} value={form.route} onChange={(e) => set('route', e.target.value)} placeholder="e.g. Oral" /></div>
        <div><label className={label}>Frequency</label><input className={input} value={form.frequency} onChange={(e) => set('frequency', e.target.value)} placeholder="e.g. Twice daily" /></div>
        <div className="sm:col-span-2"><label className={label}>Administration times (comma-separated, HH:MM)</label><input className={input} value={form.times} onChange={(e) => set('times', e.target.value)} placeholder="08:00, 20:00" /></div>
        <div><label className={label}>Start date</label><input type="date" className={input} value={form.startDate} onChange={(e) => set('startDate', e.target.value)} /></div>
        <div><label className={label}>End date</label><input type="date" className={input} value={form.endDate} onChange={(e) => set('endDate', e.target.value)} /></div>
        <div className="sm:col-span-2"><label className={label}>Prescribing physician</label><input className={input} value={form.physician} onChange={(e) => set('physician', e.target.value)} /></div>
        <div className="sm:col-span-2"><label className={label}>Special instructions</label><textarea rows={2} className={input} value={form.instructions} onChange={(e) => set('instructions', e.target.value)} /></div>
        <label className="flex items-center gap-2 text-[13px] text-foreground"><input type="checkbox" checked={form.isPrn} onChange={(e) => set('isPrn', e.target.checked)} /> PRN (as needed)</label>
        <label className="flex items-center gap-2 text-[13px] text-foreground"><input type="checkbox" checked={form.isControlled} onChange={(e) => set('isControlled', e.target.checked)} /> Controlled substance</label>
      </div>
      {error && <p className="mt-3 rounded-lg bg-status-error-bg px-3 py-2 text-[12px] text-status-error">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button onClick={() => setOpen(false)} className="rounded-lg border border-border px-4 py-2 text-[13px] font-semibold text-foreground hover:bg-muted">Cancel</button>
        <button onClick={submit} disabled={saving} className="rounded-lg bg-gradient-to-br from-brand-from to-brand-to px-4 py-2 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-60">{saving ? 'Saving…' : 'Save medication'}</button>
      </div>
    </div>
  )
}
