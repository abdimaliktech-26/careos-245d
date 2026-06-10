import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { getAuditLog } from '@/lib/super-admin/actions'
import { AuditLogTable } from '@/components/super-admin/audit-log-table'

const ACTION_OPTIONS = [
  'login', 'logout',
  'client_created', 'client_updated', 'client_viewed',
  'packet_created', 'packet_updated',
  'form_saved', 'form_submitted',
  'signature_completed',
  'pdf_downloaded', 'file_uploaded', 'file_viewed', 'file_deleted',
  'staff_record_created', 'staff_record_updated',
  'incident_submitted', 'incident_updated',
  'invite_sent', 'member_role_changed',
]

export default async function SuperAdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { user, error } = await getSession()
  if (error || !user || user.role !== 'super_admin') redirect('/auth/login')

  const params = await searchParams
  const action = typeof params.action === 'string' ? params.action : undefined
  const search = typeof params.search === 'string' ? params.search : undefined
  const page = typeof params.page === 'string' ? Math.max(1, parseInt(params.page, 10)) : 1

  const result = await getAuditLog({ action, search, page, pageSize: 50 })
  const totalPages = Math.ceil(result.total / result.pageSize)

  return (
    <div>
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">Super Admin</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-[#3A2A4A]">Audit Log</h1>
        <p className="mt-1 text-[13px] text-[#64748B]">System-wide activity across all organizations. {result.total} total entries.</p>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <form method="GET" className="flex flex-wrap gap-3">
          <input
            name="search"
            type="text"
            defaultValue={search ?? ''}
            placeholder="Search email or resource..."
            className="w-full max-w-xs rounded-xl border border-gray-200 px-4 py-2.5 text-[13px] bg-white placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#E8799E]/20 focus:border-[#E8799E]"
          />
          <select
            name="action"
            defaultValue={action ?? ''}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-[13px] bg-white text-[#3A2A4A] focus:outline-none focus:ring-2 focus:ring-[#E8799E]/20 focus:border-[#E8799E]"
          >
            <option value="">All Actions</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #E8799E 0%, #C8A8E8 100%)' }}
          >
            Filter
          </button>
          {(search || action) && (
            <Link
              href="/super-admin/audit-log"
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-[13px] font-semibold text-[#64748B] hover:bg-gray-50 transition-colors"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <AuditLogTable entries={result.entries} />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/super-admin/audit-log?${new URLSearchParams({ ...(action ? { action } : {}), ...(search ? { search } : {}), page: String(page - 1) }).toString()}`}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] font-medium text-[#64748B] hover:bg-gray-50"
            >
              Previous
            </Link>
          )}
          <span className="text-[12px] text-[#94A3B8]">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/super-admin/audit-log?${new URLSearchParams({ ...(action ? { action } : {}), ...(search ? { search } : {}), page: String(page + 1) }).toString()}`}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] font-medium text-[#64748B] hover:bg-gray-50"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
