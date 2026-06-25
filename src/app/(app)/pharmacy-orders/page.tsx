import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { PackageCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-status-warn-bg text-status-warn',
  pending_review: 'bg-status-warn-bg text-status-warn',
  approved: 'bg-status-ok-bg text-status-ok',
  rejected: 'bg-status-error-bg text-status-error',
  needs_clarification: 'bg-status-error-bg text-status-error',
  active: 'bg-status-ok-bg text-status-ok',
  discontinued: 'bg-muted text-muted-foreground',
}

type Row = {
  id: string
  status: string
  notes: string | null
  submitted_at: string | null
  payload: Record<string, unknown>
  clients: { legal_name: string; preferred_name: string | null } | { legal_name: string; preferred_name: string | null }[] | null
  pharmacies: { name: string } | { name: string }[] | null
}
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)

export default async function PharmacyOrdersPage() {
  const { user, error } = await getSession()
  if (error || !user?.organizationId) redirect('/auth/login')
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('medication_orders')
    .select('id, status, notes, submitted_at, payload, clients(legal_name, preferred_name), pharmacies(name)')
    .order('created_at', { ascending: false })
  const rows = (data ?? []) as Row[]

  return (
    <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-from to-brand-to text-white"><PackageCheck className="h-5 w-5" /></span>
        <div>
          <h1 className="text-xl font-bold text-foreground">Pharmacy Orders</h1>
          <p className="text-[13px] text-muted-foreground">Medication orders submitted by pharmacies for review.</p>
        </div>
      </header>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-[13px] text-muted-foreground">
          No pharmacy orders yet.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const c = one(r.clients); const p = one(r.pharmacies)
            const medName = (r.payload?.name as string) ?? 'Medication order'
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-bold text-foreground">{medName}</p>
                    <p className="text-[13px] text-muted-foreground">{c?.preferred_name || c?.legal_name || 'Client'} · {p?.name ?? 'Pharmacy'}</p>
                    {r.notes && <p className="mt-1 text-[12px] text-muted-foreground">{r.notes}</p>}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLES[r.status] ?? 'bg-muted text-muted-foreground'}`}>{r.status.replace('_', ' ')}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
