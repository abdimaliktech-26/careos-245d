'use client'

import { useActionState } from 'react'
import { createServiceAuthAction as createServiceAuth } from '@/lib/billing/service-auth-actions'

export function ServiceAuthForm({ clients }: { clients: Array<{ id: string; legal_name: string }> }) {
  const [state, action, isPending] = useActionState(
    createServiceAuth as (state: { error: string | null; success: boolean }, payload: FormData) => Promise<{ error: string | null; success: boolean }>,
    { error: null, success: false }
  )

  return (
    <form action={action} className="rounded-2xl border border-border bg-card p-5 space-y-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-primary">New Authorization</p>

      {state.error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{state.error}</p>}
      {state.success && <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">Authorization created.</p>}

      <div>
        <label className="text-xs font-medium text-muted-foreground">Client</label>
        <select name="clientId" required className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
          <option value="">Select...</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.legal_name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Auth #</label>
          <input name="authNumber" required className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Payer</label>
          <input name="payer" required className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" placeholder="Minnesota DHS" />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">CPT/HCPCS Code</label>
        <input name="cptCode" required className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" placeholder="T1019" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Start Date</label>
          <input name="startDate" type="date" required className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">End Date</label>
          <input name="endDate" type="date" required className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Authorized Units</label>
        <input name="authorizedUnits" type="number" required className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
      </div>

      <button type="submit" disabled={isPending} className="w-full rounded-lg bg-primary py-2.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40">
        {isPending ? 'Creating...' : 'Create Authorization'}
      </button>
    </form>
  )
}
