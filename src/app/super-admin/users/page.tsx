import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { getAllUsers, getAllOrganizations } from '@/lib/super-admin/actions'
import { UserTable } from '@/components/super-admin/user-table'
import { CreateUserDialog } from '@/components/super-admin/create-user-dialog'

export default async function SuperAdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { user, error } = await getSession()
  if (error || !user || user.role !== 'super_admin') redirect('/auth/login')

  const params = await searchParams
  const search = typeof params.search === 'string' ? params.search : undefined
  const role = typeof params.role === 'string' ? params.role : undefined

  const [users, organizations] = await Promise.all([
    getAllUsers(search, role),
    getAllOrganizations(),
  ])

  const orgOptions = organizations.map((org) => ({ id: org.id, name: org.name }))

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Super Admin</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">Users</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{users.length} user{users.length !== 1 ? 's' : ''} across all organizations.</p>
        </div>
        <CreateUserDialog organizations={orgOptions} />
      </div>

      {/* Filters */}
      <div className="mb-6">
        <form method="GET" className="flex gap-3">
          <input
            name="search"
            type="text"
            defaultValue={search ?? ''}
            placeholder="Search by name or email..."
            className="w-full max-w-sm rounded-xl border border-border px-4 py-2.5 text-[13px] bg-card placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring"
          />
          <select
            name="role"
            defaultValue={role ?? ''}
            className="rounded-xl border border-border px-4 py-2.5 text-[13px] bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring"
          >
            <option value="">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="org_admin">Org Admin</option>
            <option value="program_manager">Program Manager</option>
            <option value="staff">Staff</option>
            <option value="external_signer">External Signer</option>
          </select>
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-br from-brand-from to-brand-to px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <UserTable users={users} />
      </div>
    </div>
  )
}
