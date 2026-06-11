import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { ServiceAuthForm } from '@/components/billing/service-auth-form'
import { ServiceAuthListClient } from '@/components/billing/service-auth-list-client'

export default async function ServiceAuthsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>
}) {
  const { user, error } = await getSession()
  if (error || !user || !['staff', 'program_manager', 'org_admin', 'super_admin'].includes(user.role))
    redirect('/dashboard')

  const params = await searchParams
  const searchQuery = params.search ?? ''
  const statusFilter = params.status ?? ''

  const supabase = await createClient()

  let query = supabase
    .from('service_authorizations')
    .select('*, clients(legal_name)')
    .eq('organization_id', user.organizationId)
    .order('end_date', { ascending: false })
    .limit(100)

  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  const { data: auths } = await query

  const { data: clients } = await supabase
    .from('clients')
    .select('id, legal_name')
    .eq('organization_id', user.organizationId)
    .eq('is_active', true)

  const { data: allAuths } = await supabase
    .from('service_authorizations')
    .select('status')
    .eq('organization_id', user.organizationId)

  const safeAll = allAuths ?? []

  const totalActive = safeAll.filter((a) => a.status === 'active').length
  const totalExpired = safeAll.filter((a) => a.status === 'expired').length
  const totalExhausted = safeAll.filter((a) => a.status === 'exhausted').length

  // Filter by search query (client-side since we need to search across joined data)
  const filtered = searchQuery
    ? (auths ?? []).filter((a) => {
        const clientName = ((a.clients as { legal_name?: string } | null)?.legal_name ?? '').toLowerCase()
        const authNum = (a.auth_number ?? '').toLowerCase()
        const payer = (a.payer ?? '').toLowerCase()
        const q = searchQuery.toLowerCase()
        return clientName.includes(q) || authNum.includes(q) || payer.includes(q)
      })
    : (auths ?? [])

  const STATUS_STYLES: Record<string, string> = {
    active: 'bg-status-ok-bg text-status-ok border border-emerald-200',
    expired: 'bg-status-error-bg text-status-error border border-red-200',
    exhausted: 'bg-status-warn-bg text-status-warn border border-amber-200',
  }

  const STATUS_BG: Record<string, string> = {
    active: 'bg-emerald-500',
    expired: 'bg-red-500',
    exhausted: 'bg-amber-500',
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase mb-2">Billing</p>
        <h1 className="text-3xl font-bold text-foreground">Service Authorizations</h1>
        <p className="text-muted-foreground mt-1">Track 245D service authorizations, units, and payer limits.</p>
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <Link href={statusFilter === 'active' ? '/billing-readiness/authorizations' : '/billing-readiness/authorizations?status=active'}
          className={`rounded-2xl border bg-card p-5 transition-all hover:shadow-md ${statusFilter === 'active' ? 'ring-2 ring-emerald-500/20 border-emerald-200' : 'border-border'}`}
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          <p className="text-2xl font-bold text-emerald-600">{totalActive}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mt-1">Active</p>
        </Link>
        <Link href={statusFilter === 'expired' ? '/billing-readiness/authorizations' : '/billing-readiness/authorizations?status=expired'}
          className={`rounded-2xl border bg-card p-5 transition-all hover:shadow-md ${statusFilter === 'expired' ? 'ring-2 ring-red-500/20 border-red-200' : 'border-border'}`}
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          <p className="text-2xl font-bold text-red-600">{totalExpired}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mt-1">Expired</p>
        </Link>
        <Link href={statusFilter === 'exhausted' ? '/billing-readiness/authorizations' : '/billing-readiness/authorizations?status=exhausted'}
          className={`rounded-2xl border bg-card p-5 transition-all hover:shadow-md ${statusFilter === 'exhausted' ? 'ring-2 ring-amber-500/20 border-amber-200' : 'border-border'}`}
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          <p className="text-2xl font-bold text-amber-600">{totalExhausted}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mt-1">Exhausted</p>
        </Link>
      </div>

      {/* Search bar */}
      <form method="GET" action="/billing-readiness/authorizations" className="flex items-center gap-3">
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            name="search"
            defaultValue={searchQuery}
            placeholder="Search by client, auth #, or payer..."
            className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10"
          />
        </div>
        {searchQuery && (
          <Link href="/billing-readiness/authorizations" className="text-xs text-muted-foreground hover:text-muted-foreground">
            Clear
          </Link>
        )}
      </form>

      <div className="flex gap-6">
        <div className="flex-1">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? 'No authorizations match your search.'
                  : 'No service authorizations yet.'}
              </p>
              {(searchQuery || statusFilter) && (
                <Link href="/billing-readiness/authorizations" className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90">
                  Clear filters
                </Link>
              )}
            </div>
          ) : (
            <ServiceAuthListClient
              auths={filtered as Array<Record<string, unknown>>}
              statusStyles={STATUS_STYLES}
              statusBg={STATUS_BG}
            />
          )}
        </div>
        <div className="w-80 shrink-0">
          <ServiceAuthForm clients={(clients ?? []) as Array<{ id: string; legal_name: string }>} />
        </div>
      </div>
    </div>
  )
}
