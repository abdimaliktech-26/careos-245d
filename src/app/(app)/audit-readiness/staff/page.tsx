import { redirect } from 'next/navigation'
import { CheckCircle2, XCircle, CalendarClock } from 'lucide-react'
import { getSession } from '@/lib/auth/get-session'
import { analyzeStaffCompliance } from '@/lib/audit-readiness/staff-risk'
import { complianceBand, BAND_COLORS } from '@/lib/audit-readiness/score'
import { AuditTabs } from '@/components/audit-readiness/audit-tabs'
import { RiskBadge } from '@/components/audit-readiness/risk-badge'
import { ScoreGauge } from '@/components/audit/scorecard-badge'

export default async function StaffCompliancePage() {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')
  const organizationId = user.organizationId

  const result = organizationId
    ? await analyzeStaffCompliance(organizationId)
    : { staff: [], highRisk: [], upcomingExpirations: [], hasDesignatedCoordinator: false, hasDesignatedManager: false, averageScore: 100 }

  const band = complianceBand(result.averageScore)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Staff Compliance</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Training, certifications, background studies, and 245D designated roles.</p>
      </div>

      <AuditTabs />

      {/* Summary */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
          <ScoreGauge score={result.averageScore} size="md" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Avg Staff Score</p>
            <p className="text-[22px] font-bold leading-none" style={{ color: BAND_COLORS[band] }}>{result.averageScore}</p>
          </div>
        </div>
        <RequirementCard label="Designated Coordinator" met={result.hasDesignatedCoordinator} />
        <RequirementCard label="Designated Manager" met={result.hasDesignatedManager} />
        <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-status-error-bg text-status-error">
            <XCircle className="h-[18px] w-[18px]" />
          </div>
          <p className="text-[28px] font-bold leading-none text-foreground">{result.highRisk.length}</p>
          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">High-Risk Staff</p>
        </div>
      </div>

      {/* Upcoming expirations */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-border bg-card" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
        <div className="flex items-center gap-2 border-b border-border px-6 py-4">
          <CalendarClock className="h-4 w-4 text-status-warn" />
          <h2 className="text-[13px] font-bold text-foreground">Upcoming Expirations (next 30 days)</h2>
        </div>
        {result.upcomingExpirations.length === 0 ? (
          <p className="px-6 py-8 text-[13px] text-muted-foreground">No certifications or studies expiring soon.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                {['Staff', 'Item', 'Expires', 'Days Left'].map((h) => (
                  <th key={h} className="px-6 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {result.upcomingExpirations.map((e, i) => (
                <tr key={i} className="transition-colors hover:bg-muted/40">
                  <td className="px-6 py-3 text-[13px] font-medium text-foreground">{e.name}</td>
                  <td className="px-6 py-3 text-[12px] text-muted-foreground">{e.item}</td>
                  <td className="px-6 py-3 text-[12px] tabular-nums text-muted-foreground">{e.expiresOn}</td>
                  <td className="px-6 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${e.daysUntil <= 7 ? 'bg-status-error-bg text-status-error' : 'bg-status-warn-bg text-status-warn'}`}>
                      {e.daysUntil}d
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Staff list */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-[13px] font-bold text-foreground">All Staff</h2>
        </div>
        {result.staff.length === 0 ? (
          <p className="px-6 py-8 text-[13px] text-muted-foreground">No staff records found.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                {['Staff', 'Score', 'Compliance Gaps', 'Risk'].map((h) => (
                  <th key={h} className="px-6 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {result.staff.map((s) => (
                <tr key={s.staffId} className="align-top transition-colors hover:bg-muted/40">
                  <td className="px-6 py-3">
                    <p className="text-[13px] font-semibold text-foreground">{s.name}</p>
                    {s.title && <p className="text-[11px] text-muted-foreground">{s.title}</p>}
                  </td>
                  <td className="px-6 py-3 text-[13px] font-bold tabular-nums text-foreground">{s.score}</td>
                  <td className="px-6 py-3">
                    {s.gaps.length === 0
                      ? <span className="text-[12px] text-status-ok">Compliant</span>
                      : <ul className="space-y-1">{s.gaps.map((g, i) => <li key={i} className="text-[12px] text-foreground">• {g.label}</li>)}</ul>}
                  </td>
                  <td className="px-6 py-3"><RiskBadge level={s.riskLevel} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function RequirementCard({ label, met }: { label: string; met: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${met ? 'bg-status-ok-bg text-status-ok' : 'bg-status-error-bg text-status-error'}`}>
        {met ? <CheckCircle2 className="h-[18px] w-[18px]" /> : <XCircle className="h-[18px] w-[18px]" />}
      </div>
      <p className="text-[14px] font-bold text-foreground">{met ? 'Met' : 'Not Met'}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
    </div>
  )
}
