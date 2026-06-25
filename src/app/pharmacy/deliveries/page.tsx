import { createClient as createServerClient } from '@/lib/supabase/server'
import { RefillRespond } from '@/components/pharmacy/refill-respond'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  filled: 'bg-status-warn-bg text-status-warn',
  shipped: 'bg-status-ok-bg text-status-ok',
  delivered: 'bg-status-ok-bg text-status-ok',
}
type Row = { id: string; status: string; clients: { legal_name: string; preferred_name: string | null } | { legal_name: string; preferred_name: string | null }[] | null; medications: { name: string } | { name: string }[] | null }
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)

export default async function PharmacyDeliveriesPage() {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('refill_requests')
    .select('id, status, clients(legal_name, preferred_name), medications(name)')
    .in('status', ['filled', 'shipped', 'delivered'])
    .order('responded_at', { ascending: false })
  const rows = (data ?? []) as Row[]

  return (
    <div className="mx-auto max-w-4xl px-6 py-7">
      <h1 className="mb-1 text-xl font-bold text-foreground">Deliveries</h1>
      <p className="mb-6 text-[13px] text-muted-foreground">Track fills through shipping and delivery.</p>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-[13px] text-muted-foreground">No deliveries in progress.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const c = one(r.clients); const m = one(r.medications)
            return (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <div>
                  <p className="text-[14px] font-semibold text-foreground">{m?.name ?? 'Medication'}</p>
                  <p className="text-[12px] text-muted-foreground">{c?.preferred_name || c?.legal_name || 'Client'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLES[r.status] ?? 'bg-muted text-muted-foreground'}`}>{r.status}</span>
                  <RefillRespond refillId={r.id} current={r.status} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
