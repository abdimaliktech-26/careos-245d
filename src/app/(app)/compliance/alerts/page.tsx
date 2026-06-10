import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { getActiveAlerts, getAlertSummary } from '@/lib/audit/compliance-alerts'
import { AlertCard } from '@/components/compliance/alert-card'
import { AlertFilters } from '@/components/compliance/alert-filters'
import { DismissButton } from '@/components/compliance/dismiss-button'

type SearchParams = Promise<{ type?: string; severity?: string }>

function StatsCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`rounded-2xl border ${color} p-4`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-current opacity-70">{label}</p>
      <p className="mt-2 text-3xl font-black text-current">{count}</p>
    </div>
  )
}

export default async function ComplianceAlertsPage(props: { searchParams: SearchParams }) {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')
  if (!user.organizationId) redirect('/dashboard')

  const searchParams = await props.searchParams
  const alerts = await getActiveAlerts(user.organizationId, {
    type: searchParams.type,
    severity: searchParams.severity,
  })
  const summary = await getAlertSummary(user.organizationId)

  return (
    <div>
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
          Compliance
        </p>
        <div className="mt-1.5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#3A2A4A]">Compliance Alerts</h1>
            <p className="mt-1 text-[13px] text-[#64748B]">
              Proactive alerts for upcoming deadlines, missing signatures, and overdue items.
            </p>
          </div>
          <AlertFilters />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatsCard label="Total Active" count={summary.total} color="bg-gray-50 text-gray-700 border-gray-200" />
        <StatsCard label="Critical" count={summary.critical} color="bg-red-50 text-red-700 border-red-200" />
        <StatsCard label="Warning" count={summary.warning} color="bg-amber-50 text-amber-700 border-amber-200" />
        <StatsCard label="Info" count={summary.info} color="bg-blue-50 text-blue-700 border-blue-200" />
      </div>

      <section
        className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-[14px] font-semibold text-[#3A2A4A]">Active Alerts</h2>
        </div>
        {alerts.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <p className="text-[13px] font-semibold text-[#3A2A4A]">No active compliance alerts</p>
            <p className="mt-1 text-[12px] text-[#94A3B8]">
              Your organization is on track based on the current check.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {alerts.map((alert) => (
              <div key={alert.id} className="px-6 py-4">
                <AlertCard alert={alert} onDismiss={async () => {}} showActions={false} />
                <div className="mt-2 flex justify-end">
                  <DismissButton alertId={alert.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
