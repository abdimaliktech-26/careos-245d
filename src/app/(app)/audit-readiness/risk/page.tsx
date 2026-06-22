import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { analyzeClientDocumentation } from '@/lib/audit-readiness/client-risk'
import { gapRecommendation } from '@/lib/audit-readiness/recommendations'
import { AuditTabs } from '@/components/audit-readiness/audit-tabs'
import { RiskBadge } from '@/components/audit-readiness/risk-badge'
import { ScoreGauge } from '@/components/audit/scorecard-badge'

export default async function ComplianceRiskPage() {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')
  const organizationId = user.organizationId

  const clientRisks = organizationId ? await analyzeClientDocumentation(organizationId) : []
  const atRisk = clientRisks.filter((c) => c.gaps.length > 0)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Compliance Risk Score</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          AI risk engine analysis of every client&apos;s documentation. Lowest scores first.
        </p>
      </div>

      <AuditTabs />

      {atRisk.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
          <p className="text-[14px] font-semibold text-foreground">No compliance risks detected</p>
          <p className="mt-1 text-[13px] text-muted-foreground">All client files meet documentation requirements.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {atRisk.map((c) => (
            <div key={c.clientId} className="overflow-hidden rounded-2xl border border-border bg-card" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
              <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
                <div className="flex items-center gap-4">
                  <ScoreGauge score={c.score} size="sm" />
                  <div>
                    <Link href={`/clients/${c.clientId}`} className="text-[14px] font-semibold text-foreground hover:text-primary">
                      {c.clientName}
                    </Link>
                    <p className="text-[12px] capitalize text-muted-foreground">{c.program} · {c.status}</p>
                  </div>
                </div>
                <RiskBadge level={c.riskLevel} />
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    {['Finding', 'Regulation', 'Recommended Action', 'Risk'].map((h) => (
                      <th key={h} className="px-6 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {c.gaps.map((g, i) => {
                    const rec = gapRecommendation(g.code)
                    return (
                      <tr key={i} className="align-top">
                        <td className="px-6 py-3 text-[13px] font-medium text-foreground">{g.label}</td>
                        <td className="px-6 py-3 text-[12px] text-muted-foreground">{rec.regulation}</td>
                        <td className="px-6 py-3 text-[12px] text-muted-foreground">{rec.action}</td>
                        <td className="px-6 py-3"><RiskBadge level={g.risk} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
