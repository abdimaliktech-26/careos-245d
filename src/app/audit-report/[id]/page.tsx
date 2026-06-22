import Link from 'next/link'
import Image from 'next/image'
import { redirect, notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { ScoreGauge } from '@/components/audit/scorecard-badge'
import { ReportExport } from '@/components/audit-readiness/report-export'
import { complianceBand, BAND_LABELS, BAND_COLORS, type AuditRiskLevel } from '@/lib/audit-readiness/score'
import { generateReportNarrative } from '@/lib/audit-readiness/ai/audit-report'

type Props = { params: Promise<{ id: string }> }

interface FindingRow {
  client_id: string | null
  staff_id: string | null
  category: string
  regulation_category: string | null
  risk_level: AuditRiskLevel
  finding: string
  recommended_action: string | null
}

export default async function AuditReportPage({ params }: Props) {
  const { user, error } = await getSession()
  if (error || !user || !user.organizationId) redirect('/auth/login')
  const organizationId = user.organizationId
  const { id } = await params

  const supabase = await createClient()
  const { data: review } = await supabase
    .from('audit_reviews')
    .select('id, title, compliance_score, findings_count, status, reviewer_name, created_at, completed_at, summary')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single()

  if (!review) notFound()

  const [{ data: findingsData }, { data: caps }, { data: org }, { count: totalClients }, { data: incidents }] = await Promise.all([
    supabase.from('audit_findings').select('client_id, staff_id, category, regulation_category, risk_level, finding, recommended_action').eq('audit_review_id', id).eq('organization_id', organizationId),
    supabase.from('corrective_action_plans').select('finding, risk_level, corrective_action, responsible_person, due_date, status').eq('audit_review_id', id).eq('organization_id', organizationId),
    supabase.from('organizations').select('name, logo_url, brand_primary').eq('id', organizationId).single(),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('incidents').select('category, status').eq('organization_id', organizationId),
  ])

  const findings = (findingsData ?? []) as FindingRow[]
  const score = review.compliance_score ?? 0
  const band = complianceBand(score)
  const organizationName = org?.name ?? 'Organization'

  const high = findings.filter((f) => f.risk_level === 'high')
  const moderate = findings.filter((f) => f.risk_level === 'moderate')
  const low = findings.filter((f) => f.risk_level === 'low')
  const docGaps = findings.filter((f) => f.category === 'client_documentation')
  const staffFindings = findings.filter((f) => f.category === 'staff_compliance')
  const missingDocuments = docGaps.filter((f) => /missing/i.test(f.finding)).length

  const incidentByCategory = new Map<string, number>()
  let openIncidents = 0
  for (const inc of (incidents ?? []) as Array<{ category: string; status: string }>) {
    incidentByCategory.set(inc.category, (incidentByCategory.get(inc.category) ?? 0) + 1)
    if (inc.status !== 'closed') openIncidents += 1
  }

  const { narrative } = await generateReportNarrative(
    {
      organizationName,
      overallScore: score,
      totalClients: totalClients ?? 0,
      highRiskCount: high.length,
      missingDocuments,
      openIncidents,
      topFindings: high.slice(0, 5).map((f) => f.finding),
    },
    { organizationId, userId: user.id },
  )

  const findingCsvRows = findings.map((f) => ({
    Category: f.category,
    Risk: f.risk_level,
    Finding: f.finding,
    Regulation: f.regulation_category ?? '',
    'Recommended Action': f.recommended_action ?? '',
  }))

  const reportDate = new Date(review.completed_at ?? review.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-screen bg-muted/30 py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Link href="/audit-readiness/reports" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to reports
          </Link>
          <ReportExport targetId="audit-report" filename={`audit-report-${id.slice(0, 8)}`} findingRows={findingCsvRows} />
        </div>

        <div id="audit-report" className="rounded-2xl border border-border bg-white p-10 shadow-sm print:rounded-none print:border-0 print:shadow-none">
          {/* Header / branding */}
          <header className="mb-8 flex items-start justify-between gap-6 border-b border-border pb-6">
            <div>
              {org?.logo_url ? (
                <Image src={org.logo_url} alt={organizationName} width={140} height={44} unoptimized className="mb-3 h-11 w-auto object-contain" />
              ) : (
                <p className="mb-2 text-lg font-bold" style={{ color: org?.brand_primary ?? '#10B99A' }}>{organizationName}</p>
              )}
              <h1 className="text-2xl font-bold tracking-tight text-foreground">245D Audit Readiness Report</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">{review.title} · {reportDate}</p>
              {review.reviewer_name && <p className="text-[12px] text-muted-foreground">Reviewer: {review.reviewer_name}</p>}
            </div>
            <div className="flex flex-col items-center">
              <ScoreGauge score={score} size="lg" />
              <span className="mt-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase" style={{ backgroundColor: `${BAND_COLORS[band]}1A`, color: BAND_COLORS[band] }}>
                {BAND_LABELS[band]}
              </span>
            </div>
          </header>

          <Section title="Executive Summary">
            <p className="text-[13.5px] leading-relaxed text-foreground">{narrative.executiveSummary}</p>
          </Section>

          <Section title="Compliance Score">
            <div className="flex items-center gap-6">
              <p className="text-[48px] font-black leading-none" style={{ color: BAND_COLORS[band] }}>{score}<span className="text-[20px] text-muted-foreground">/100</span></p>
              <div className="grid grid-cols-3 gap-6 text-center">
                <Stat label="High Risk" value={high.length} color="#EF4444" />
                <Stat label="Moderate" value={moderate.length} color="#F59E0B" />
                <Stat label="Low" value={low.length} color="#10B981" />
              </div>
            </div>
          </Section>

          <Section title="High-Risk Findings"><FindingList items={high} emptyText="No high-risk findings." /></Section>
          <Section title="Moderate-Risk Findings"><FindingList items={moderate} emptyText="No moderate-risk findings." /></Section>
          <Section title="Documentation Gaps"><FindingList items={docGaps} emptyText="No documentation gaps." /></Section>
          <Section title="Staff Compliance Findings"><FindingList items={staffFindings} emptyText="No staff compliance findings." /></Section>

          <Section title="Incident Trends">
            {incidentByCategory.size === 0 ? (
              <p className="text-[13px] text-muted-foreground">No incidents on record.</p>
            ) : (
              <table className="w-full text-[13px]">
                <tbody>
                  {[...incidentByCategory.entries()].map(([cat, n]) => (
                    <tr key={cat} className="border-b border-border/60">
                      <td className="py-2 capitalize text-foreground">{cat.replaceAll('_', ' ')}</td>
                      <td className="py-2 text-right font-semibold tabular-nums text-foreground">{n}</td>
                    </tr>
                  ))}
                  <tr><td className="py-2 font-semibold text-foreground">Open incidents</td><td className="py-2 text-right font-bold tabular-nums text-status-error">{openIncidents}</td></tr>
                </tbody>
              </table>
            )}
          </Section>

          <Section title="Corrective Action Plan">
            {(caps ?? []).length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No corrective action plan generated for this review.</p>
            ) : (
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-semibold">Finding</th>
                    <th className="py-2 pr-3 font-semibold">Action</th>
                    <th className="py-2 pr-3 font-semibold">Responsible</th>
                    <th className="py-2 pr-3 font-semibold">Due</th>
                    <th className="py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(caps as Array<{ finding: string; corrective_action: string; responsible_person: string | null; due_date: string | null; status: string }>).map((c, i) => (
                    <tr key={i} className="border-b border-border/60 align-top">
                      <td className="py-2 pr-3 text-foreground">{c.finding}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{c.corrective_action}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{c.responsible_person ?? '—'}</td>
                      <td className="py-2 pr-3 tabular-nums text-muted-foreground">{c.due_date ?? '—'}</td>
                      <td className="py-2 capitalize text-foreground">{c.status.replaceAll('_', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section title="Recommendations">
            <ol className="list-decimal space-y-2 pl-5 text-[13px] text-foreground">
              {narrative.recommendations.map((r, i) => <li key={i}>{r}</li>)}
            </ol>
          </Section>

          <footer className="mt-8 border-t border-border pt-4 text-[11px] text-muted-foreground">
            Generated by {organizationName} · 245D Audit Readiness · {reportDate}
          </footer>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="mb-3 text-[15px] font-bold tracking-tight text-foreground">{title}</h2>
      {children}
    </section>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <p className="text-[24px] font-bold leading-none" style={{ color }}>{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  )
}

function FindingList({ items, emptyText }: { items: ReadonlyArray<FindingRow>; emptyText: string }) {
  if (items.length === 0) return <p className="text-[13px] text-muted-foreground">{emptyText}</p>
  return (
    <ul className="space-y-2.5">
      {items.map((f, i) => (
        <li key={i} className="border-l-2 border-border pl-3">
          <p className="text-[13px] font-medium text-foreground">{f.finding}</p>
          {f.regulation_category && <p className="text-[11.5px] text-muted-foreground">{f.regulation_category}</p>}
          {f.recommended_action && <p className="text-[12px] text-muted-foreground">→ {f.recommended_action}</p>}
        </li>
      ))}
    </ul>
  )
}
