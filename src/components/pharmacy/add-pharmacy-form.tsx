'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { createPharmacyAndLink } from '@/lib/pharmacy/admin-actions'

const input = 'w-full rounded-lg border border-input bg-card px-3 py-2 text-[13px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/15'

export function AddPharmacyForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', contactName: '', email: '', phone: '' })

  async function submit() {
    setError(null)
    if (!form.name.trim()) { setError('Pharmacy name is required.'); return }
    setSaving(true)
    const res = await createPharmacyAndLink({ name: form.name, contactName: form.contactName || undefined, email: form.email || undefined, phone: form.phone || undefined })
    setSaving(false)
    if (res.error) { setError(res.error); return }
    setForm({ name: '', contactName: '', email: '', phone: '' })
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-brand-from to-brand-to px-4 py-2 text-[13px] font-bold text-white hover:opacity-90">
        <Plus className="h-4 w-4" /> Add pharmacy
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-3 text-[14px] font-bold text-foreground">New pharmacy</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><input className={input} placeholder="Pharmacy name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <input className={input} placeholder="Contact name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
        <input className={input} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className={input} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      {error && <p className="mt-3 rounded-lg bg-status-error-bg px-3 py-2 text-[12px] text-status-error">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button onClick={() => setOpen(false)} className="rounded-lg border border-border px-4 py-2 text-[13px] font-semibold text-foreground hover:bg-muted">Cancel</button>
        <button onClick={submit} disabled={saving} className="rounded-lg bg-gradient-to-br from-brand-from to-brand-to px-4 py-2 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-60">{saving ? 'Saving…' : 'Add & link pharmacy'}</button>
      </div>
    </div>
  )
}
