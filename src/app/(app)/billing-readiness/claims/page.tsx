import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { ClaimForm } from '@/components/billing/claim-form'
import { ClaimTable } from '@/components/billing/claim-table'

export default async function ClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; selected?: string }>
}) {
  const { user, error } = await getSession()
  if (error || !user || !['staff', 'program_manager', 'org_admin', 'super_admin'].includes(user.role))
    redirect('/dashboard')

  const params = await searchParams
  const statusFilter = params.status || 'all'
  const selectedId = params.selected || null

  const supabase = await createClient()

  let query = supabase
    .from('claims')
    .select('*, clients(legal_name, date_of_birth, address, city, state, zip, phone, medicaid_number)')
    .eq('organization_id', user.organizationId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data: claims } = await query

  const { data: clients } = await supabase
    .from('clients')
    .select('id, legal_name')
    .eq('organization_id', user.organizationId)
    .eq('is_active', true)

  const { data: serviceAuths } = await supabase
    .from('service_authorizations')
    .select('id, auth_number, cpt_code, payer')
    .eq('organization_id', user.organizationId)
    .eq('status', 'active')

  const { data: allClaims } = await supabase
    .from('claims')
    .select('status, amount')
    .eq('organization_id', user.organizationId)

  const safeAll = allClaims ?? []

  const stats = {
    total: safeAll.length,
    totalAmount: safeAll.reduce((sum, c) => sum + (Number(c.amount) || 0), 0),
    pending: safeAll.filter((c) => c.status === 'draft' || c.status === 'submitted').length,
    pendingAmount: safeAll.filter((c) => c.status === 'draft' || c.status === 'submitted').reduce((sum, c) => sum + (Number(c.amount) || 0), 0),
    paid: safeAll.filter((c) => c.status === 'paid').length,
    paidAmount: safeAll.filter((c) => c.status === 'paid').reduce((sum, c) => sum + (Number(c.amount) || 0), 0),
    denied: safeAll.filter((c) => c.status === 'denied').length,
    deniedAmount: safeAll.filter((c) => c.status === 'denied').reduce((sum, c) => sum + (Number(c.amount) || 0), 0),
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

  const selectedClaim = selectedId
    ? claims?.find((c) => c.id === selectedId) ?? null
    : null

  const counts = {
    all: safeAll.length,
    draft: safeAll.filter((c) => c.status === 'draft').length,
    submitted: safeAll.filter((c) => c.status === 'submitted').length,
    paid: safeAll.filter((c) => c.status === 'paid').length,
    denied: safeAll.filter((c) => c.status === 'denied').length,
  }

  const FILTERS = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'draft', label: 'Draft', count: counts.draft },
    { key: 'submitted', label: 'Submitted', count: counts.submitted },
    { key: 'paid', label: 'Paid', count: counts.paid },
    { key: 'denied', label: 'Denied', count: counts.denied },
  ] as const

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.16em] text-gray-400 uppercase mb-2">Billing</p>
        <h1 className="text-3xl font-bold text-[#3A2A4A]">Claims</h1>
        <p className="text-gray-500 mt-1">Manage billing claims, track submissions, and export CMS-1500 forms.</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-2xl font-bold text-[#3A2A4A]">{stats.total}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 mt-0.5">Total Claims</p>
          <p className="text-xs text-gray-500 mt-1">{formatCurrency(stats.totalAmount)}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 mt-0.5">Pending</p>
          <p className="text-xs text-gray-500 mt-1">{formatCurrency(stats.pendingAmount)}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-2xl font-bold text-emerald-600">{stats.paid}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 mt-0.5">Paid</p>
          <p className="text-xs text-gray-500 mt-1">{formatCurrency(stats.paidAmount)}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-2xl font-bold text-red-600">{stats.denied}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 mt-0.5">Denied</p>
          <p className="text-xs text-gray-500 mt-1">{formatCurrency(stats.deniedAmount)}</p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === 'all' ? '/billing-readiness/claims' : `/billing-readiness/claims?status=${f.key}`}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
              statusFilter === f.key
                ? 'bg-white text-[#3A2A4A] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f.label}
            <span className={`ml-1.5 ${statusFilter === f.key ? 'text-[#E8799E]' : 'text-gray-400'}`}>
              {f.count}
            </span>
          </Link>
        ))}
      </div>

      <div className="flex gap-6">
        <div className="flex-1 min-w-0 space-y-4">
          <ClaimTable
            claims={(claims ?? []) as Array<Record<string, unknown>>}
            selectedId={selectedId}
          />

          {/* Claim detail panel */}
          {selectedClaim && (
            <div className="rounded-2xl border border-gray-100 bg-white p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#E8799E]">Claim Detail</p>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                    selectedClaim.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    selectedClaim.status === 'denied' ? 'bg-red-50 text-red-700 border border-red-200' :
                    selectedClaim.status === 'submitted' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                    'bg-gray-100 text-gray-700 border border-gray-200'
                  }`}>
                    {(selectedClaim.status as string).charAt(0).toUpperCase() + (selectedClaim.status as string).slice(1)}
                  </span>
                </div>
                <Link
                  href={statusFilter === 'all' ? '/billing-readiness/claims' : `/billing-readiness/claims?status=${statusFilter}`}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Close
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 block">Claim #</span>
                  <span className="font-mono text-[#3A2A4A] font-semibold">{selectedClaim.claim_number as string}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 block">Client</span>
                  <span className="text-[#3A2A4A] font-medium">{detailClient?.legal_name ?? '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 block">Payer</span>
                  <span className="text-[#3A2A4A]">{selectedClaim.payer as string}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 block">CPT Code</span>
                  <span className="font-mono text-[#3A2A4A]">{selectedClaim.cpt_code as string}{selectedClaim.modifier ? ` / ${selectedClaim.modifier}` : ''}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 block">Auth #</span>
                  <span className="text-[#3A2A4A]">{selectedClaim.auth_number || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 block">Amount</span>
                  <span className="text-[#3A2A4A] font-bold">{typeof selectedClaim.amount === 'number' ? formatCurrency(selectedClaim.amount) : '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 block">Rate</span>
                  <span className="text-[#3A2A4A]">{typeof selectedClaim.rate === 'number' ? formatCurrency(selectedClaim.rate) : '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 block">Service Date</span>
                  <span className="text-[#3A2A4A]">{(selectedClaim.service_date as string)?.slice(0, 10)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 block">Submitted</span>
                  <span className="text-[#3A2A4A]">{selectedClaim.submitted_at ? new Date(selectedClaim.submitted_at as string).toLocaleDateString() : '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 block">Paid At</span>
                  <span className="text-[#3A2A4A]">{selectedClaim.paid_at ? new Date(selectedClaim.paid_at as string).toLocaleDateString() : '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 block">Created</span>
                  <span className="text-[#3A2A4A]">{selectedClaim.created_at ? new Date(selectedClaim.created_at as string).toLocaleDateString() : '—'}</span>
                </div>
              </div>

              {selectedClaim.notes && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 block mb-1">Notes</span>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedClaim.notes as string}</p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                <a
                  href={`/api/billing/export/claims/${selectedClaim.id}`}
                  className="rounded-lg bg-[#E8799E] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 inline-flex items-center gap-1.5"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export CMS-1500
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="w-80 shrink-0">
          <ClaimForm
            clients={(clients ?? []) as Array<{ id: string; legal_name: string }>}
            serviceAuths={(serviceAuths ?? []) as Array<{ id: string; auth_number: string; cpt_code: string; payer: string }>}
            initialData={null}
          />
        </div>
      </div>
    </div>
  )
}
