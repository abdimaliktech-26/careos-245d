import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')

  const params = await searchParams
  const search = params.search ?? ''

  const supabase = await createClient()

  const query = supabase
    .from('clients')
    .select('id, legal_name, date_of_birth, intake_date, status, program')
    .eq('organization_id', user.organizationId ?? '')
    .order('legal_name', { ascending: true })

  if (search) {
    query.ilike('legal_name', `%${search}%`)
  }

  const { data: clients } = await query

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
            Service Recipients
          </p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-[#3A2A4A]">Clients</h1>
          <p className="mt-1 text-[13px] text-[#64748B]">
            All active and inactive service recipients in your organization.
          </p>
        </div>
        <Link
          href="/clients/new"
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #E8799E 0%, #C8A8E8 100%)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Client
        </Link>
      </div>

      {/* Table */}
      <div
        className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3.5">
          <form method="GET" action="/clients" className="relative flex-1 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              name="search"
              placeholder="Search clients…"
              className="care-input w-full rounded-xl border py-2 pl-9 pr-3 text-[13px] placeholder:text-[#CBD5E1]"
            />
          </form>
          {clients && clients.length > 0 && (
            <span className="text-[11px] font-medium text-[#94A3B8]">
              {clients.length} record{clients.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {!clients || clients.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8799E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <p className="text-[13px] font-semibold text-[#3A2A4A]">No clients yet</p>
            <p className="mt-1 text-[12px] text-[#94A3B8]">Add your first service recipient to get started.</p>
            <Link
              href="/clients/new"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #E8799E 0%, #C8A8E8 100%)' }}
            >
              Add Client →
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Name', 'Date of Birth', 'Program', 'Status', 'Intake Date'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clients.map((c: Record<string, unknown>) => (
                <tr key={c.id as string} className="group transition-colors hover:bg-gray-50/60">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/clients/${c.id as string}`}
                      className="text-[13px] font-semibold text-[#E8799E] hover:text-[#C06080] transition-colors"
                    >
                      {c.legal_name as string}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] tabular-nums text-[#64748B]">
                    {(c.date_of_birth as string) ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-[#64748B]">
                    {(c.program as string) ?? '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.04em] ${
                      c.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : c.status === 'inactive'
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-red-50 text-red-600'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        c.status === 'active' ? 'bg-emerald-500' : c.status === 'inactive' ? 'bg-gray-400' : 'bg-red-500'
                      }`} />
                      {(c.status as string)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[12px] tabular-nums text-[#94A3B8]">
                    {(c.intake_date as string) ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
