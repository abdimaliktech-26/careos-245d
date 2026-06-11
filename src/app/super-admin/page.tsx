import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { getSystemStats, getRecentOrganizations } from '@/lib/super-admin/actions'
import { StatCard, StatusBadge } from '@/components/super-admin/stat-card'

function IconBuilding({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
    </svg>
  )
}

function IconUsers({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}

function IconClipboard({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
    </svg>
  )
}


export default async function SuperAdminDashboard() {
  const { user, error } = await getSession()
  if (error || !user || user.role !== 'super_admin') redirect('/auth/login')

  const stats = await getSystemStats()
  const recentOrgs = await getRecentOrganizations(10)

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Super Admin · System Overview</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">Welcome, {user.fullName.split(' ')[0]}.</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {stats.totalOrganizations} organizations · {stats.totalUsers} active users · {stats.totalClients} clients
        </p>
      </div>

      {/* Stats grid */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Organizations" value={stats.totalOrganizations} iconBg="#EEF2FF" iconColor="#DB2777">
          <IconBuilding color="#DB2777" />
        </StatCard>
        <StatCard label="Active Organizations" value={stats.activeOrganizations} iconBg="#ECFDF5" iconColor="#10B981">
          <IconBuilding color="#10B981" />
        </StatCard>
        <StatCard label="Total Users" value={stats.totalUsers} iconBg="#EEF2FF" iconColor="#DB2777">
          <IconUsers color="#DB2777" />
        </StatCard>
        <StatCard label="Total Clients" value={stats.totalClients} iconBg="#FEF3C7" iconColor="#D97706">
          <IconClipboard color="#D97706" />
        </StatCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent organizations */}
        <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-border bg-card" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Organizations</p>
              <h2 className="mt-0.5 text-[13px] font-bold text-foreground">Recently Created</h2>
            </div>
            <Link href="/super-admin/organizations" className="text-[12px] font-medium text-primary hover:opacity-80 transition-opacity">
              View all →
            </Link>
          </div>
          {recentOrgs.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-[13px] font-semibold text-foreground">No organizations yet</p>
              <p className="mt-1 text-[12px] text-muted-foreground">Create your first organization to get started.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Name', 'Status', 'Plan', 'Members', 'Clients'].map((h) => (
                    <th key={h} className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {recentOrgs.map((org) => (
                  <tr key={org.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/super-admin/organizations/${org.id}`} className="text-[13px] font-semibold text-foreground hover:text-primary">
                        {org.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={org.status} /></td>
                    <td className="px-5 py-3 text-[12px] capitalize text-muted-foreground">{org.plan ?? '—'}</td>
                    <td className="px-5 py-3 text-[12px] text-muted-foreground">{org.memberCount}</td>
                    <td className="px-5 py-3 text-[12px] text-muted-foreground">{org.clientCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Quick actions / health */}
        <div className="space-y-6">
          {/* System health */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">System Health</p>
            <h2 className="mt-0.5 text-[13px] font-bold text-foreground mb-4">Platform Metrics</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted-foreground">Organizations</span>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-status-ok" title="Active" />
                    <span className="h-2 w-2 rounded-full bg-status-warn" title="Pending" />
                    <span className="h-2 w-2 rounded-full bg-status-error" title="Suspended" />
                  </div>
                  <span className="text-[12px] font-medium text-foreground tabular-nums">
                    {stats.activeOrganizations}/{stats.pendingOrganizations}/{stats.suspendedOrganizations}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted-foreground">Total Packets</span>
                <span className="text-[12px] font-medium text-foreground tabular-nums">{stats.totalPackets.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted-foreground">Total Incidents</span>
                <span className="text-[12px] font-medium text-foreground tabular-nums">{stats.totalIncidents.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Quick Actions</p>
            <h2 className="mt-0.5 text-[13px] font-bold text-foreground mb-4">Tools</h2>
            <div className="space-y-2">
              <Link
                href="/super-admin/organizations/new"
                className="flex items-center gap-2.5 rounded-xl bg-gradient-to-br from-brand-from to-brand-to px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Create Organization
              </Link>
              <Link
                href="/super-admin/audit-log"
                className="flex items-center gap-2.5 rounded-xl border border-border px-4 py-2.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted/40"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                View Audit Log
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
