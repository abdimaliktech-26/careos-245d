import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { RefreshCw } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  requested: 'bg-status-warn-bg text-status-warn',
  received: 'bg-muted text-muted-foreground',
  processing: 'bg-muted text-muted-foreground',
  waiting_physician: 'bg-status-warn-bg text-status-warn',
  filled: 'bg-status-ok-bg text-status-ok',
  shipped: 'bg-status-ok-bg text-status-ok',
  delivered: 'bg-status-ok-bg text-status-ok',
  denied: 'bg-status-error-bg text-status-error',
  needs_clarification: 'bg-status-error-bg text-status-error',
}

type Row = {
  id: string
  status: string
  urgency: string
  days_remaining: number | null
  requested_at: string
  clients: { legal_name: string; preferred_name: string | null } | { legal_name: string; preferred_name: string | null }[] | null
  medications: { name: string } | { name: string }[] | null
}
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)

export default async function RefillsPage() {
  const { user, error } = await getSession()
  if (error || !user?.organizationId) redirect('/auth/login')
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('refill_requests')
    .select('id, status, urgency, days_remaining, requested_at, clients(legal_name, preferred_name), medications(name)')
    .order('requested_at', { ascending: false })
  const rows = (data ?? []) as Row[]

  return (
    <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-from to-brand-to text-white"><RefreshCw className="h-5 w-5" /></span>
        <div>
          <h1 className="text-xl font-bold text-foreground">Refill Requests</h1>
          <p className="text-[13px] text-muted-foreground">Track refill requests sent to pharmacies.</p>
        </div>
      </header>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-[13px] text-muted-foreground">
          No refill requests yet. Request a refill from a client&apos;s medication.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-3 font-semibold">Client</th><th className="px-4 py-3 font-semibold">Medication</th><th className="px-4 py-3 font-semibold">Urgency</th><th className="px-4 py-3 font-semibold">Days left</th><th className="px-4 py-3 font-semibold">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const c = one(r.clients); const m = one(r.medications)
                return (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{c?.preferred_name || c?.legal_name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m?.name ?? '—'}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{r.urgency}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.days_remaining ?? '—'}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLES[r.status] ?? 'bg-muted text-muted-foreground'}`}>{r.status.replace('_', ' ')}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
