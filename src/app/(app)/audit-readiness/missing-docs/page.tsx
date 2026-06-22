import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FileText, FileCheck2, PenLine, UserCog } from 'lucide-react'
import { getSession } from '@/lib/auth/get-session'
import { analyzeClientDocumentation } from '@/lib/audit-readiness/client-risk'
import { analyzeStaffCompliance } from '@/lib/audit-readiness/staff-risk'
import { buildMissingDocReport, missingDocCsvRows } from '@/lib/audit-readiness/missing-docs'
import { AuditTabs } from '@/components/audit-readiness/audit-tabs'
import { RiskBadge } from '@/components/audit-readiness/risk-badge'
import { ExportButtons } from '@/components/audit-readiness/export-buttons'
import type { LucideIcon } from 'lucide-react'

export default async function MissingDocsPage() {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')
  const organizationId = user.organizationId

  const [clientRisks, staffResult] = organizationId
    ? await Promise.all([analyzeClientDocumentation(organizationId), analyzeStaffCompliance(organizationId)])
    : [[], null]

  const report = buildMissingDocReport(clientRisks, { staff: staffResult?.staff ?? [] })
  const csvRows = missingDocCsvRows(report)

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Missing Documentation Center</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Compliance gap report across all client files and staff records.</p>
        </div>
        <ExportButtons filename="missing-documentation" rows={csvRows} />
      </div>

      <AuditTabs />

      {/* By organization */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <OrgStat label="Missing Intake Forms" value={report.byOrg.missingIntakeForms} Icon={FileText} />
        <OrgStat label="Missing Annual Reviews" value={report.byOrg.missingAnnualReviews} Icon={FileCheck2} />
        <OrgStat label="Missing Signatures" value={report.byOrg.missingSignatures} Icon={PenLine} />
        <OrgStat label="Missing Staff Documents" value={report.byOrg.missingStaffDocuments} Icon={UserCog} />
      </div>

      {/* By client */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-[13px] font-bold text-foreground">Gaps by Client</h2>
        </div>
        {report.byClient.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-[13px] text-muted-foreground">No documentation gaps found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  {['Client', 'Program', 'Missing Documents', 'Overdue Reviews', 'Risk Level'].map((h) => (
                    <th key={h} className="px-6 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {report.byClient.map((row) => (
                  <tr key={row.clientId} className="align-top transition-colors hover:bg-muted/40">
                    <td className="px-6 py-3">
                      <Link href={`/clients/${row.clientId}`} className="text-[13px] font-semibold text-foreground hover:text-primary">{row.clientName}</Link>
                    </td>
                    <td className="px-6 py-3 text-[12px] capitalize text-muted-foreground">{row.program}</td>
                    <td className="px-6 py-3">
                      <ul className="space-y-1">
                        {row.missingDocuments.length === 0
                          ? <li className="text-[12px] text-muted-foreground">—</li>
                          : row.missingDocuments.map((d, i) => <li key={i} className="text-[12px] text-foreground">• {d}</li>)}
                      </ul>
                    </td>
                    <td className="px-6 py-3 text-[13px] font-medium tabular-nums text-foreground">{row.overdueReviews}</td>
                    <td className="px-6 py-3"><RiskBadge level={row.riskLevel} /></td>
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

function OrgStat({ label, value, Icon }: { label: string; value: number; Icon: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-status-warn-bg text-status-warn">
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <p className="text-[28px] font-bold leading-none tracking-tight text-foreground">{value}</p>
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
    </div>
  )
}
