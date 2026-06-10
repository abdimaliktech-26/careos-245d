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
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
            Revenue Protection
          </p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-[#3A2A4A]">Billing Readiness</h1>
          <p className="mt-1 text-[13px] text-[#64748B]">
            Review completed documentation before billing — signatures, stored documents, overdue packets, and EVV exceptions.
          </p>
        </div>

        {/* Readiness score ring */}
        <div
          className="flex shrink-0 items-center gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-4"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          <div className="text-center">
            <p className={`text-3xl font-bold tracking-tight ${readyPct >= 90 ? 'text-emerald-600' : readyPct >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
              {readyPct}%
            </p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">Ready</p>
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
        className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        {report.items.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8799E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <p className="text-[13px] font-semibold text-[#3A2A4A]">No submitted forms to review</p>
            <p className="mt-1 text-[12px] text-[#94A3B8]">
              Forms appear here once they reach needs-signature or completed status.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['Client', 'Packet', 'Form', 'Program', 'Billing Status', 'Issues'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {report.items.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-gray-50/60">
                    <td className="px-5 py-3.5">
                      <Link
                        href={item.href}
                        className="text-[13px] font-semibold text-[#E8799E] hover:text-[#C06080] transition-colors"
                      >
                        {item.clientName}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-[12px] capitalize text-[#64748B]">
                      {item.packetType.replaceAll('_', ' ')}
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-[#64748B]">{item.formName}</td>
                    <td className="px-5 py-3.5 text-[12px] text-[#94A3B8]">{item.program}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        item.status === 'ready'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${item.status === 'ready' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {item.status === 'ready' ? 'Ready' : 'Blocked'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-[#94A3B8]">
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
    success: { border: 'border-gray-100', num: 'text-[#3A2A4A]', badge: '' },
    danger:  { border: isAlert ? 'border-red-100' : 'border-gray-100',  num: isAlert ? 'text-red-600'  : 'text-[#3A2A4A]', badge: isAlert ? 'bg-red-500' : '' },
    warning: { border: isAlert ? 'border-amber-100' : 'border-gray-100', num: isAlert ? 'text-amber-600' : 'text-[#3A2A4A]', badge: isAlert ? 'bg-amber-500' : '' },
  }[variant]

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-white px-4 py-4 ${styles.border}`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {isAlert && styles.badge && (
        <div className={`absolute inset-y-0 left-0 w-[3px] rounded-l-2xl ${styles.badge}`} />
      )}
      <p className={`text-2xl font-bold tracking-tight ${styles.num}`}>{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">{label}</p>
    </div>
  )
}
