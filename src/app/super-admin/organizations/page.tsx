import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { getAllOrganizations } from '@/lib/super-admin/actions'
import { OrgTable } from '@/components/super-admin/org-table'

export default async function SuperAdminOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { user, error } = await getSession()
  if (error || !user || user.role !== 'super_admin') redirect('/auth/login')

  const params = await searchParams
  const search = typeof params.search === 'string' ? params.search : undefined
  const orgs = await getAllOrganizations(search)

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">Super Admin</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-[#3A2A4A]">Organizations</h1>
          <p className="mt-1 text-[13px] text-[#64748B]">{orgs.length} organization{orgs.length !== 1 ? 's' : ''} on the platform.</p>
        </div>
        <Link
          href="/super-admin/organizations/new"
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #E8799E 0%, #C8A8E8 100%)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Organization
        </Link>
      </div>

      {/* Search */}
      <div className="mb-6">
        <form method="GET" className="flex gap-3">
          <input
            name="search"
            type="text"
            defaultValue={search ?? ''}
            placeholder="Search organizations..."
            className="w-full max-w-sm rounded-xl border border-gray-200 px-4 py-2.5 text-[13px] bg-white placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#E8799E]/20 focus:border-[#E8799E]"
          />
          <button
            type="submit"
            className="rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #E8799E 0%, #C8A8E8 100%)' }}
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <OrgTable orgs={orgs} />
      </div>
    </div>
  )
}
