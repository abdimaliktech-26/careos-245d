import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { getActiveAlerts, getAlertSummary, getAlertSettings } from '@/lib/audit/compliance-alerts'
import { AlertCard } from '@/components/compliance/alert-card'
import { AlertSettingsForm } from '@/components/compliance/alert-settings-form'

export default async function AdminComplianceAlertsPage() {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')
  if (!user.organizationId || !['org_admin', 'super_admin'].includes(user.role)) redirect('/dashboard')

  const [alerts, summary, settings] = await Promise.all([
    getActiveAlerts(user.organizationId, { includeDismissed: true }),
    getAlertSummary(user.organizationId),
    getAlertSettings(user.organizationId),
  ])

  const activeAlerts = alerts.filter((a) => !a.isDismissed)
  const dismissedAlerts = alerts.filter((a) => a.isDismissed)

  return (
    <div>
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
          Admin
        </p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-[#3A2A4A]">Compliance Alerts</h1>
        <p className="mt-1 text-[13px] text-[#64748B]">
          Monitor all compliance alerts across your organization and configure alert thresholds.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">Total</p>
          <p className="mt-2 text-3xl font-black text-[#3A2A4A]">{summary.total}</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-red-700">Critical</p>
          <p className="mt-2 text-3xl font-black text-red-700">{summary.critical}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">Warning</p>
          <p className="mt-2 text-3xl font-black text-amber-700">{summary.warning}</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700">Info</p>
          <p className="mt-2 text-3xl font-black text-blue-700">{summary.info}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div>
          {/* Active alerts */}
          <section
            className="mb-6 overflow-hidden rounded-2xl border border-gray-100 bg-white"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-[14px] font-semibold text-[#3A2A4A]">Active Alerts</h2>
            </div>
            {activeAlerts.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-[13px] text-[#94A3B8]">No active alerts</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {activeAlerts.map((alert) => (
                  <div key={alert.id} className="px-6 py-4">
                    <AlertCard alert={alert} />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Dismissed alerts */}
          {dismissedAlerts.length > 0 && (
            <section
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            >
              <div className="border-b border-gray-100 px-6 py-4">
                <h2 className="text-[14px] font-semibold text-[#94A3B8]">Dismissed Alerts</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {dismissedAlerts.map((alert) => (
                  <div key={alert.id} className="px-6 py-4 opacity-60">
                    <AlertCard alert={alert} showActions={false} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Settings panel */}
        <div>
          <section
            className="rounded-2xl border border-gray-100 bg-white p-6"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <h2 className="text-[14px] font-semibold text-[#3A2A4A]">Alert Thresholds</h2>
            <p className="mt-1 text-[12px] text-[#64748B]">
              Configure when compliance alerts are triggered and how often we remind you.
            </p>
            <div className="mt-5">
              <AlertSettingsForm initial={settings} />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
