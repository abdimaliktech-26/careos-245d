import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { getBillingReadinessReport } from '@/lib/billing-readiness/report'

export default async function BillingReadinessPage() {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')
  if (!user.organizationId) redirect('/dashboard')

  const report = await getBillingReadinessReport(user.organizationId)

  const readyPct = report.readyForms + report.blockedForms > 0
    ? Math.round((report.readyForms / (report.readyForms + report.blockedForms)) * 100)
    : 100

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Revenue Protection
          </p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">Billing Readiness</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Review completed documentation before billing — signatures, stored documents, overdue packets, and EVV exceptions.
          </p>
        </div>

        {/* Readiness score ring */}
        <div
          className="flex shrink-0 items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          <div className="text-center">
            <p className={`text-3xl font-bold tracking-tight ${readyPct >= 90 ? 'text-emerald-600' : readyPct >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
              {readyPct}%
            </p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Ready</p>
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <MetricCard label="Ready Forms"     value={report.readyForms}      variant="success" />
        <MetricCard label="Blocked Forms"   value={report.blockedForms}    variant="danger" />
        <MetricCard label="Missing Docs"    value={report.missingDocuments} variant="warning" />
        <MetricCard label="Overdue Packets" value={report.overduePackets}  variant="danger" />
        <MetricCard label="EVV Exceptions"  value={report.evvExceptions}   variant="warning" />
      </div>

      {/* Table */}
      <div
        className="overflow-hidden rounded-2xl border border-border bg-card"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        {report.items.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B99A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <p className="text-[13px] font-semibold text-foreground">No submitted forms to review</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Forms appear here once they reach needs-signature or completed status.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['Client', 'Packet', 'Form', 'Program', 'Billing Status', 'Issues'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {report.items.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-5 py-3.5">
                      <Link
                        href={item.href}
                        className="text-[13px] font-semibold text-primary hover:text-[#C06080] transition-colors"
                      >
                        {item.clientName}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-[12px] capitalize text-muted-foreground">
                      {item.packetType.replaceAll('_', ' ')}
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{item.formName}</td>
                    <td className="px-5 py-3.5 text-[12px] text-muted-foreground">{item.program}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        item.status === 'ready'
                          ? 'bg-status-ok-bg text-status-ok'
                          : 'bg-status-error-bg text-status-error'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${item.status === 'ready' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {item.status === 'ready' ? 'Ready' : 'Blocked'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-muted-foreground">
                      {item.issues.length === 0
                        ? <span className="text-emerald-600 font-medium">No issues</span>
                        : item.issues.join('; ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({ label, value, variant }: { label: string; value: number; variant: 'success' | 'danger' | 'warning' }) {
  const isAlert = variant !== 'success' && value > 0
  const styles = {
    success: { border: 'border-border', num: 'text-foreground', badge: '' },
    danger:  { border: isAlert ? 'border-red-100' : 'border-border',  num: isAlert ? 'text-red-600'  : 'text-foreground', badge: isAlert ? 'bg-red-500' : '' },
    warning: { border: isAlert ? 'border-amber-100' : 'border-border', num: isAlert ? 'text-amber-600' : 'text-foreground', badge: isAlert ? 'bg-amber-500' : '' },
  }[variant]

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-card px-4 py-4 ${styles.border}`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {isAlert && styles.badge && (
        <div className={`absolute inset-y-0 left-0 w-[3px] rounded-l-2xl ${styles.badge}`} />
      )}
      <p className={`text-2xl font-bold tracking-tight ${styles.num}`}>{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
    </div>
  )
}
