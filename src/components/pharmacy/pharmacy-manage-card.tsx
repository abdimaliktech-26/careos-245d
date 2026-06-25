'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Link2, ShieldCheck } from 'lucide-react'
import { setPharmacyLinkStatus, assignPharmacyToClient, createPharmacyUser } from '@/lib/pharmacy/admin-actions'

export type ClientOption = { id: string; name: string }

const STATUS_STYLES: Record<string, string> = {
  invited: 'bg-status-warn-bg text-status-warn',
  pending: 'bg-status-warn-bg text-status-warn',
  approved: 'bg-status-ok-bg text-status-ok',
  rejected: 'bg-status-error-bg text-status-error',
  suspended: 'bg-muted text-muted-foreground',
}
const input = 'w-full rounded-lg border border-input bg-card px-3 py-2 text-[13px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/15'

export function PharmacyManageCard({
  linkId, pharmacyId, pharmacyName, contact, status, clients,
}: {
  linkId: string; pharmacyId: string; pharmacyName: string; contact: string; status: string; clients: ClientOption[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [panel, setPanel] = useState<'assign' | 'login' | null>(null)

  // assign state
  const [clientId, setClientId] = useState(clients[0]?.id ?? '')
  const [isPrimary, setIsPrimary] = useState(false)
  // login state
  const [login, setLogin] = useState({ fullName: '', email: '', password: 'Demo2026!', role: 'pharmacy_admin' as 'pharmacy_admin' | 'pharmacy_staff' })

  async function toggleStatus(next: 'approved' | 'suspended') {
    setBusy(true); setMsg(null)
    const res = await setPharmacyLinkStatus(linkId, next)
    setBusy(false)
    if (res.error) { setMsg(res.error); return }
    router.refresh()
  }

  async function assign() {
    if (!clientId) { setMsg('Pick a client.'); return }
    setBusy(true); setMsg(null)
    const res = await assignPharmacyToClient({ clientId, pharmacyId, isPrimary })
    setBusy(false)
    if (res.error) { setMsg(res.error); return }
    setMsg('Client assigned.'); setPanel(null); router.refresh()
  }

  async function createLogin() {
    if (!login.email || !login.password || !login.fullName) { setMsg('Name, email, and password are required.'); return }
    setBusy(true); setMsg(null)
    const res = await createPharmacyUser({ pharmacyId, email: login.email, fullName: login.fullName, role: login.role, password: login.password })
    setBusy(false)
    if (res.error) { setMsg(res.error); return }
    setMsg(`Login created for ${login.email}.`); setPanel(null)
    setLogin({ fullName: '', email: '', password: 'Demo2026!', role: 'pharmacy_admin' })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold text-foreground">{pharmacyName}</p>
          <p className="text-[12px] text-muted-foreground">{contact || 'No contact details'}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground'}`}>{status}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {status !== 'approved' && (
          <button onClick={() => toggleStatus('approved')} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-brand-from to-brand-to px-3 py-1.5 text-[12px] font-bold text-white hover:opacity-90 disabled:opacity-60">
            <ShieldCheck className="h-3.5 w-3.5" /> Approve
          </button>
        )}
        {status === 'approved' && (
          <button onClick={() => toggleStatus('suspended')} disabled={busy} className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold text-status-error hover:bg-status-error-bg disabled:opacity-60">
            Suspend
          </button>
        )}
        <button onClick={() => setPanel(panel === 'assign' ? null : 'assign')} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold text-foreground hover:bg-muted">
          <Link2 className="h-3.5 w-3.5" /> Assign client
        </button>
        <button onClick={() => setPanel(panel === 'login' ? null : 'login')} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold text-foreground hover:bg-muted">
          <UserPlus className="h-3.5 w-3.5" /> Create login
        </button>
      </div>

      {panel === 'assign' && (
        <div className="mt-3 space-y-2 rounded-lg bg-muted/40 p-3">
          {clients.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">No clients in this organization yet.</p>
          ) : (
            <>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={input}>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <label className="flex items-center gap-2 text-[12px] text-foreground"><input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} /> Primary pharmacy for this client</label>
              <button onClick={assign} disabled={busy} className="rounded-lg bg-gradient-to-br from-brand-from to-brand-to px-3 py-1.5 text-[12px] font-bold text-white hover:opacity-90 disabled:opacity-60">{busy ? '…' : 'Assign'}</button>
            </>
          )}
        </div>
      )}

      {panel === 'login' && (
        <div className="mt-3 space-y-2 rounded-lg bg-muted/40 p-3">
          <input className={input} placeholder="Full name" value={login.fullName} onChange={(e) => setLogin({ ...login, fullName: e.target.value })} />
          <input className={input} placeholder="Email" value={login.email} onChange={(e) => setLogin({ ...login, email: e.target.value })} />
          <input className={input} placeholder="Temporary password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} />
          <select value={login.role} onChange={(e) => setLogin({ ...login, role: e.target.value as 'pharmacy_admin' | 'pharmacy_staff' })} className={input}>
            <option value="pharmacy_admin">Pharmacy Admin</option>
            <option value="pharmacy_staff">Pharmacy Staff</option>
          </select>
          <button onClick={createLogin} disabled={busy} className="rounded-lg bg-gradient-to-br from-brand-from to-brand-to px-3 py-1.5 text-[12px] font-bold text-white hover:opacity-90 disabled:opacity-60">{busy ? '…' : 'Create login'}</button>
        </div>
      )}

      {msg && <p className="mt-2 text-[12px] text-muted-foreground">{msg}</p>}
    </div>
  )
}
