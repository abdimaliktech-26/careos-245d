import { createClient as createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
type Row = { id: string; display_name: string; category: string; created_at: string; clients: { legal_name: string; preferred_name: string | null } | { legal_name: string; preferred_name: string | null }[] | null }
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)

export default async function PharmacyDocumentsPage() {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('pharmacy_documents')
    .select('id, display_name, category, created_at, clients(legal_name, preferred_name)')
    .order('created_at', { ascending: false })
  const rows = (data ?? []) as Row[]

  return (
    <div className="mx-auto max-w-4xl px-6 py-7">
      <h1 className="mb-1 text-xl font-bold text-foreground">Documents</h1>
      <p className="mb-6 text-[13px] text-muted-foreground">Prescriptions and orders shared with your providers.</p>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-[13px] text-muted-foreground">No documents uploaded yet.</div>
      ) : (
        <div className="space-y-2">
          {rows.map((d) => {
            const c = one(d.clients)
            return (
              <div key={d.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <div>
                  <p className="text-[14px] font-semibold text-foreground">{d.display_name}</p>
                  <p className="text-[12px] capitalize text-muted-foreground">{d.category.replace(/_/g, ' ')} · {c?.preferred_name || c?.legal_name || '—'}</p>
                </div>
                <span className="text-[11px] text-muted-foreground">{new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
