import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { getAuditAssistantReport, saveAuditReport, type AuditSeverity } from '@/lib/audit/assistant'

const SEVERITY_CLASS: Record<AuditSeverity, string> = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-blue-50 text-blue-700 border-blue-200',
}

function scoreClass(score: number) {
  if (score >= 90) return 'text-green-700 bg-green-50 border-green-200'
  if (score >= 75) return 'text-amber-700 bg-amber-50 border-amber-200'
  return 'text-red-700 bg-red-50 border-red-200'
}

export default async function AuditAssistantPage() {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')
  if (!user.organizationId || !['org_admin', 'program_manager', 'super_admin'].includes(user.role)) redirect('/dashboard')

  const report = await getAuditAssistantReport(user.organizationId)
  const savedReportId = await saveAuditReport(user.organizationId, report, 'manual', user.id).catch(() => null)

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">AI Audit Assistant</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-[#3A2A4A]">Compliance Readiness Review</h1>
          <p className="mt-1 max-w-2xl text-[13px] text-[#64748B]">
            Automated audit scan for due dates, packet form counts, required signatures, stored documents, staff setup, and subscription readiness.
          </p>
        </div>
        <div className={`rounded-2xl border px-5 py-4 ${scoreClass(report.score)}`}>
          <p className="text-xs font-bold uppercase tracking-[0.14em]">Readiness Score</p>
          <p className="mt-1 text-4xl font-black">{report.score}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(['critical', 'high', 'medium', 'low'] as AuditSeverity[]).map((severity) => (
          <div key={severity} className={`rounded-2xl border p-4 ${SEVERITY_CLASS[severity]}`}>
            <p className="text-xs font-bold uppercase tracking-[0.14em]">{severity}</p>
            <p className="mt-2 text-3xl font-black">{report.counts[severity]}</p>
          </div>
        ))}
      </div>

      <section
        className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-[14px] font-semibold text-[#3A2A4A]">Findings</h2>
          <p className="mt-0.5 text-[12px] text-[#64748B]">
            Generated {new Date(report.generatedAt).toLocaleString('en-US')}
            {savedReportId ? ` · Saved report ${savedReportId.slice(0, 8)}` : ''}
          </p>
        </div>
        {report.findings.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-[13px] font-semibold text-[#3A2A4A]">No audit issues found</p>
            <p className="mt-1 text-[12px] text-[#94A3B8]">The organization is ready based on the current automated checks.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {report.findings.map((finding) => (
              <div key={finding.id} className="grid gap-4 px-6 py-5 lg:grid-cols-[150px_1fr_auto] lg:items-start">
                <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-bold uppercase ${SEVERITY_CLASS[finding.severity]}`}>
                  {finding.severity}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[13px] font-semibold text-[#3A2A4A]">{finding.title}</h3>
                    <span className="rounded-full bg-[#EEF2FF] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#E8799E]">
                      {finding.category}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#64748B]">{finding.summary}</p>
                  <p className="mt-1.5 text-[12px] font-semibold text-[#E8799E]">{finding.nextAction}</p>
                </div>
                {finding.href && (
                  <Link
                    href={finding.href}
                    className="inline-flex items-center justify-center rounded-full bg-[#E8799E] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#C06080] transition-colors"
                  >
                    Open
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
