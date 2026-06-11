'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateServiceAuth } from '@/lib/billing/service-auth-actions'

export function ServiceAuthEditForm({
  auth,
  onClose,
}: {
  auth: Record<string, unknown>
  onClose: () => void
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const formData = new FormData(e.currentTarget)
    const result = await updateServiceAuth(auth.id as string, formData)
    if (result.error) {
      setError(result.error)
      setSaving(false)
      return
    }
    setSaving(false)
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-card rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()} style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.15)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-foreground">Edit Authorization</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-muted-foreground">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Auth #</label>
              <input name="authNumber" required defaultValue={auth.auth_number as string} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Payer</label>
              <input name="payer" required defaultValue={auth.payer as string} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">CPT/HCPCS Code</label>
            <input name="cptCode" required defaultValue={auth.cpt_code as string} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Start Date</label>
              <input name="startDate" type="date" required defaultValue={(auth.start_date as string)?.slice(0, 10)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">End Date</label>
              <input name="endDate" type="date" required defaultValue={(auth.end_date as string)?.slice(0, 10)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Authorized Units</label>
              <input name="authorizedUnits" type="number" required defaultValue={auth.authorized_units as number} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Used Units</label>
              <input name="usedUnits" type="number" required defaultValue={auth.used_units as number} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <select name="status" required defaultValue={auth.status as string} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="exhausted">Exhausted</option>
            </select>
          </div>

          <button type="submit" disabled={saving} className="w-full rounded-lg bg-primary py-2.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
