import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdmin, isSuperAdmin } from '@/lib/auth/role-guards'
import { AddPharmacyForm } from '@/components/pharmacy/add-pharmacy-form'
import { Building2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  invited: 'bg-status-warn-bg text-status-warn',
  pending: 'bg-status-warn-bg text-status-warn',
  approved: 'bg-status-ok-bg text-status-ok',
  rejected: 'bg-status-error-bg text-status-error',
  suspended: 'bg-muted text-muted-foreground',
}
type Row = { id: string; status: string; pharmacies: { name: string; email: string | null; contact_name: string | null } | { name: string; email: string | null; contact_name: string | null }[] | null }
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)

export default async function AdminPharmaciesPage() {
  const { user, error } = await getSession()
  if (error || !user?.organizationId) redirect('/auth/login')
  if (!isAdmin(user.role) && !isSuperAdmin(user.role)) redirect('/dashboard')

  const supabase = await createServerClient()
  const { data } = await supabase
    .from('provider_pharmacy_links')
    .select('id, status, pharmacies(name, email, contact_name)')
    .order('created_at', { ascending: false })
  const rows = (data ?? []) as Row[]

  return (
    <div className="mx-auto max-w-4xl px-5 py-6 sm:px-8">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-from to-brand-to text-white"><Building2 className="h-5 w-5" /></span>
        <div>
          <h1 className="text-xl font-bold text-foreground">Pharmacies</h1>
          <p className="text-[13px] text-muted-foreground">Link pharmacies to your organization and manage their access.</p>
        </div>
      </header>

      <div className="mb-6"><AddPharmacyForm /></div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-[13px] text-muted-foreground">
          No pharmacies linked yet. Add one to enable the pharmacy portal and medication orders.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((l) => {
            const p = one(l.pharmacies)
            return (
              <div key={l.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <div>
                  <p className="text-[14px] font-semibold text-foreground">{p?.name ?? 'Pharmacy'}</p>
                  <p className="text-[12px] text-muted-foreground">{[p?.contact_name, p?.email].filter(Boolean).join(' · ') || 'No contact details'}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLES[l.status] ?? 'bg-muted text-muted-foreground'}`}>{l.status}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
