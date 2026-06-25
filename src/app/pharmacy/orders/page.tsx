import { createClient as createServerClient } from '@/lib/supabase/server'

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
type Row = { id: string; status: string; notes: string | null; payload: Record<string, unknown>; created_at: string; clients: { legal_name: string; preferred_name: string | null } | { legal_name: string; preferred_name: string | null }[] | null }
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)

export default async function PharmacyOrdersPage() {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('medication_orders')
    .select('id, status, notes, payload, created_at, clients(legal_name, preferred_name)')
    .order('created_at', { ascending: false })
  const rows = (data ?? []) as Row[]

  return (
    <div className="mx-auto max-w-4xl px-6 py-7">
      <h1 className="mb-1 text-xl font-bold text-foreground">Medication Orders</h1>
      <p className="mb-6 text-[13px] text-muted-foreground">Orders you have submitted to providers and their review status.</p>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-[13px] text-muted-foreground">No orders yet.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const c = one(r.clients)
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-bold text-foreground">{(r.payload?.name as string) ?? 'Medication order'}</p>
                    <p className="text-[13px] text-muted-foreground">{c?.preferred_name || c?.legal_name || 'Client'}</p>
                    {r.notes && <p className="mt-1 text-[12px] text-muted-foreground">{r.notes}</p>}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLES[r.status] ?? 'bg-muted text-muted-foreground'}`}>{r.status.replace(/_/g, ' ')}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
