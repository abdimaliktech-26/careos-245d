import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FileBarChart2, Gavel } from 'lucide-react'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { AuditTabs } from '@/components/audit-readiness/audit-tabs'
import { complianceBand, BAND_LABELS, BAND_COLORS } from '@/lib/audit-readiness/score'

interface ReviewRow {
  id: string
  title: string
  compliance_score: number | null
  findings_count: number
  status: string
  reviewer_name: string | null
  created_at: string
}

export default async function AuditReportsPage() {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')
  const organizationId = user.organizationId

  let reviews: ReviewRow[] = []
  if (organizationId) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('audit_reviews')
      .select('id, title, compliance_score, findings_count, status, reviewer_name, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
    reviews = (data ?? []) as ReviewRow[]
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Audit Reports</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Professional, branded audit reports ready to export as PDF, Word, or Excel.</p>
        </div>
        <Link href="/audit-readiness/wizard" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-gradient-to-br from-brand-from to-brand-to px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90">
          <Gavel className="h-[14px] w-[14px]" /> New Audit
        </Link>
      </div>

      <AuditTabs />

      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
            <FileBarChart2 className="h-5 w-5 text-accent-foreground" />
          </div>
          <p className="text-[14px] font-semibold text-foreground">No audit reports yet</p>
          <p className="mt-1 text-[13px] text-muted-foreground">Run the Audit Review Wizard to generate your first report.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => {
            const score = r.compliance_score ?? 0
            const band = complianceBand(score)
            return (
              <Link
                key={r.id}
                href={`/audit-report/${r.id}`}
                className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
                style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}
              >
                <div className="mb-3 flex items-start justify-between">
                  <p className="text-[40px] font-black leading-none" style={{ color: BAND_COLORS[band] }}>{score}</p>
                  <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase" style={{ backgroundColor: `${BAND_COLORS[band]}1A`, color: BAND_COLORS[band] }}>{BAND_LABELS[band]}</span>
                </div>
                <p className="text-[14px] font-semibold text-foreground">{r.title}</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {r.findings_count} finding{r.findings_count !== 1 ? 's' : ''}
                </p>
                {r.reviewer_name && <p className="mt-2 text-[11px] text-muted-foreground">By {r.reviewer_name}</p>}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
