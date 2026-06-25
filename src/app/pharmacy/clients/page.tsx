import { createClient as createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Row = {
  id: string
  is_primary: boolean
  clients: { id: string; legal_name: string; preferred_name: string | null; city: string | null } | { id: string; legal_name: string; preferred_name: string | null; city: string | null }[] | null
}
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)

export default async function PharmacyClientsPage() {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('client_pharmacy_assignments')
    .select('id, is_primary, clients(id, legal_name, preferred_name, city)')
  const rows = (data ?? []) as Row[]

  return (
    <div className="mx-auto max-w-4xl px-6 py-7">
      <h1 className="mb-1 text-xl font-bold text-foreground">Assigned Clients</h1>
      <p className="mb-6 text-[13px] text-muted-foreground">Clients your pharmacy is approved to serve.</p>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-[13px] text-muted-foreground">
          No clients assigned yet. A provider must assign your pharmacy to their clients.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const c = one(r.clients)
            return (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <div>
                  <p className="text-[14px] font-semibold text-foreground">{c?.preferred_name || c?.legal_name || 'Client'}</p>
                  {c?.city && <p className="text-[12px] text-muted-foreground">{c.city}</p>}
                </div>
                {r.is_primary && <span className="rounded-full bg-status-ok-bg px-2 py-0.5 text-[11px] font-semibold text-status-ok">Primary</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
