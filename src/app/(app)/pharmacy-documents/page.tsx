import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { FolderHeart } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Row = {
  id: string
  display_name: string
  category: string
  created_at: string
  clients: { legal_name: string; preferred_name: string | null } | { legal_name: string; preferred_name: string | null }[] | null
  pharmacies: { name: string } | { name: string }[] | null
}
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)

export default async function PharmacyDocumentsPage() {
  const { user, error } = await getSession()
  if (error || !user?.organizationId) redirect('/auth/login')
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('pharmacy_documents')
    .select('id, display_name, category, created_at, clients(legal_name, preferred_name), pharmacies(name)')
    .order('created_at', { ascending: false })
    .limit(100)
  const rows = (data ?? []) as Row[]

  return (
    <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-from to-brand-to text-white"><FolderHeart className="h-5 w-5" /></span>
        <div>
          <h1 className="text-xl font-bold text-foreground">Pharmacy Documents</h1>
          <p className="text-[13px] text-muted-foreground">Prescriptions, physician orders, and delivery receipts from pharmacies.</p>
        </div>
      </header>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-[13px] text-muted-foreground">No pharmacy documents yet.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-3 font-semibold">Document</th><th className="px-4 py-3 font-semibold">Category</th><th className="px-4 py-3 font-semibold">Client</th><th className="px-4 py-3 font-semibold">Pharmacy</th><th className="px-4 py-3 font-semibold">Added</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((d) => {
                const c = one(d.clients); const p = one(d.pharmacies)
                return (
                  <tr key={d.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{d.display_name}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{d.category.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c?.preferred_name || c?.legal_name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
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
