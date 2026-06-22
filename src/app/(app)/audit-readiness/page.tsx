import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Users, UserCheck, FolderCheck, FileWarning, FileX2, CalendarClock,
  GraduationCap, ShieldAlert, BellRing, Gavel,
} from 'lucide-react'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { getAuditCounts, combineMetrics } from '@/lib/audit-readiness/metrics'
import { analyzeClientDocumentation } from '@/lib/audit-readiness/client-risk'
import { analyzeStaffCompliance } from '@/lib/audit-readiness/staff-risk'
import { complianceBand, BAND_LABELS, BAND_COLORS, weightedOverall } from '@/lib/audit-readiness/score'
import { auditTierFromPlan, tierAllows } from '@/lib/audit-readiness/packages'
import { AuditTabs } from '@/components/audit-readiness/audit-tabs'
import { MetricCard } from '@/components/audit-readiness/metric-card'
import { RiskHeatmap } from '@/components/audit-readiness/risk-heatmap'
import { ScoreGauge } from '@/components/audit/scorecard-badge'
import { RiskBadge } from '@/components/audit-readiness/risk-badge'
import { PackagesCard } from '@/components/audit-readiness/packages-card'
import { AuditCopilot } from '@/components/audit-readiness/audit-copilot'

export default async function AuditReadinessDashboard() {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')
  const organizationId = user.organizationId

  if (!organizationId) {
    return (
      <div>
        <AuditTabs />
        <p className="text-[13px] text-muted-foreground">No organization is associated with your account.</p>
      </div>
    )
  }

  const supabase = await createClient()
  const [counts, clientRisks, staffResult, { data: org }] = await Promise.all([
    getAuditCounts(organizationId),
    analyzeClientDocumentation(organizationId),
    analyzeStaffCompliance(organizationId),
    supabase.from('organizations').select('plan').eq('id', organizationId).single(),
  ])

  const metrics = combineMetrics(counts, clientRisks, staffResult)
  const currentTier = auditTierFromPlan(org?.plan)

  const clientAvg = clientRisks.length === 0 ? 100 : Math.round(clientRisks.reduce((s, c) => s + c.score, 0) / clientRisks.length)
  const overallScore = weightedOverall([
    { score: clientAvg, weight: 2 },
    { score: staffResult.averageScore, weight: 1 },
  ])
  const band = complianceBand(overallScore)
  const topRisks = clientRisks.filter((c) => c.gaps.length > 0).slice(0, 6)

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          245D Audit Readiness · Compliance Intelligence
        </p>
        <div className="mt-1.5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Audit Readiness</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Know exactly where you stand before a licensing review, internal audit, or payer audit.
            </p>
          </div>
          <Link
            href="/audit-readiness/wizard"
            className="flex shrink-0 items-center gap-2 rounded-lg bg-gradient-to-br from-brand-from to-brand-to px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          >
            <Gavel className="h-[14px] w-[14px]" strokeWidth={2.5} />
            Start Audit Review
          </Link>
        </div>
      </div>

      <AuditTabs />

      {/* Overall score hero */}
      <div
        className="mb-8 flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center"
        style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}
      >
        <div className="flex items-center gap-5">
          <ScoreGauge score={overallScore} size="lg" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Overall Compliance Score</p>
            <p className="mt-1 text-[40px] font-black leading-none tracking-tight" style={{ color: BAND_COLORS[band] }}>
              {overallScore}
            </p>
            <span
              className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
              style={{ backgroundColor: `${BAND_COLORS[band]}1A`, color: BAND_COLORS[band] }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: BAND_COLORS[band] }} />
              {BAND_LABELS[band]}
            </span>
          </div>
        </div>
        <div className="grid flex-1 grid-cols-3 gap-4 border-t border-border pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
          <ScoreSummary label="Client Files" value={clientAvg} />
          <ScoreSummary label="Staff Compliance" value={staffResult.averageScore} />
          <ScoreSummary label="High-Risk Clients" value={clientRisks.filter((c) => c.riskLevel === 'high').length} suffix="" raw />
        </div>
      </div>

      {/* Metrics */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3">
        <MetricCard label="Total Clients" value={metrics.totalClients} Icon={Users} iconClass="bg-accent text-accent-foreground" />
        <MetricCard label="Active Clients" value={metrics.activeClients} Icon={UserCheck} iconClass="bg-accent text-accent-foreground" />
        <MetricCard label="Client Files Reviewed" value={metrics.filesReviewed} Icon={FolderCheck} iconClass="bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300" />
        <MetricCard label="Missing Documents" value={metrics.missingDocuments} Icon={FileWarning} iconClass="bg-status-warn-bg text-status-warn" variant="warning" />
        <MetricCard label="Expired Documents" value={metrics.expiredDocuments} Icon={FileX2} iconClass="bg-status-error-bg text-status-error" variant="danger" />
        <MetricCard label="Upcoming Reviews Due" value={metrics.upcomingReviewsDue} Icon={CalendarClock} iconClass="bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300" />
        <MetricCard label="Staff Training Expiring" value={metrics.staffTrainingExpiring} Icon={GraduationCap} iconClass="bg-status-warn-bg text-status-warn" variant="warning" />
        <MetricCard label="Open Incidents" value={metrics.openIncidents} Icon={ShieldAlert} iconClass="bg-status-error-bg text-status-error" variant="danger" />
        <MetricCard label="Compliance Alerts" value={metrics.complianceAlerts} Icon={BellRing} iconClass="bg-status-error-bg text-status-error" variant="danger" />
      </div>

      {/* Heat map + top risks */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 xl:col-span-2" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
          <div className="mb-4">
            <h2 className="text-[15px] font-semibold text-foreground">Client Risk Heat Map</h2>
            <p className="text-[12.5px] text-muted-foreground">Every client, colored by audit risk. Click a cell to open the record.</p>
          </div>
          <RiskHeatmap clients={clientRisks} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-6" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-foreground">Highest-Risk Clients</h2>
            <Link href="/audit-readiness/risk" className="text-[12px] font-medium text-primary transition-opacity hover:opacity-80">View all →</Link>
          </div>
          {topRisks.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No client compliance gaps detected.</p>
          ) : (
            <ul className="space-y-3">
              {topRisks.map((c) => (
                <li key={c.clientId} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/clients/${c.clientId}`} className="block truncate text-[13px] font-semibold text-foreground hover:text-primary">
                      {c.clientName}
                    </Link>
                    <p className="truncate text-[11px] text-muted-foreground">{c.gaps.length} gap{c.gaps.length !== 1 ? 's' : ''} · {c.program}</p>
                  </div>
                  <RiskBadge level={c.riskLevel} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Copilot + packages */}
      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {tierAllows(currentTier, 'copilot') ? (
          <AuditCopilot />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-8 text-center" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
            <p className="text-[14px] font-semibold text-foreground">Audit Copilot</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">Available on the Gold (Compliance Monitoring) package.</p>
          </div>
        )}
        <PackagesCard currentTier={currentTier} />
      </div>
    </div>
  )
}

function ScoreSummary({ label, value, suffix = '%', raw = false }: { label: string; value: number; suffix?: string; raw?: boolean }) {
  return (
    <div>
      <p className="text-[22px] font-bold leading-none text-foreground">{value}{raw ? '' : suffix}</p>
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
    </div>
  )
}
