import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdmin, isSuperAdmin } from '@/lib/auth/role-guards'
import { AddPharmacyForm } from '@/components/pharmacy/add-pharmacy-form'
import { PharmacyManageCard, type ClientOption } from '@/components/pharmacy/pharmacy-manage-card'
import { Building2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

type PharmRow = { id: string; name: string; email: string | null; contact_name: string | null }
type Row = { id: string; status: string; pharmacies: PharmRow | PharmRow[] | null }
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)

export default async function AdminPharmaciesPage() {
  const { user, error } = await getSession()
  if (error || !user?.organizationId) redirect('/auth/login')
  if (!isAdmin(user.role) && !isSuperAdmin(user.role)) redirect('/dashboard')

  const supabase = await createServerClient()
  const [{ data: links }, { data: clientRows }] = await Promise.all([
    supabase
      .from('provider_pharmacy_links')
      .select('id, status, pharmacies(id, name, email, contact_name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('clients')
      .select('id, legal_name, preferred_name')
      .eq('organization_id', user.organizationId)
      .order('legal_name'),
  ])

  const rows = (links ?? []) as Row[]
  const clients: ClientOption[] = (clientRows ?? []).map((c) => ({ id: c.id, name: c.preferred_name || c.legal_name }))

  return (
    <div className="mx-auto max-w-4xl px-5 py-6 sm:px-8">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-from to-brand-to text-white"><Building2 className="h-5 w-5" /></span>
        <div>
          <h1 className="text-xl font-bold text-foreground">Pharmacies</h1>
          <p className="text-[13px] text-muted-foreground">Link pharmacies, assign them to clients, and create their portal logins.</p>
        </div>
      </header>

      <div className="mb-6"><AddPharmacyForm /></div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-[13px] text-muted-foreground">
          No pharmacies linked yet. Add one to enable the pharmacy portal and medication orders.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((l) => {
            const p = one(l.pharmacies)
            if (!p) return null
            return (
              <PharmacyManageCard
                key={l.id}
                linkId={l.id}
                pharmacyId={p.id}
                pharmacyName={p.name}
                contact={[p.contact_name, p.email].filter(Boolean).join(' · ')}
                status={l.status}
                clients={clients}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
