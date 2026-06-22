import Link from 'next/link'
import { redirect } from 'next/navigation'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { AuditTabs } from '@/components/audit-readiness/audit-tabs'
import { complianceBand, BAND_COLORS } from '@/lib/audit-readiness/score'

interface ReviewRow {
  id: string
  title: string
  compliance_score: number | null
  findings_count: number
  status: string
  reviewer_name: string | null
  created_at: string
}

export default async function AuditHistoryPage() {
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

  // Compute score delta vs. the chronologically previous review (older = next in this desc list).
  const deltas = reviews.map((r, i) => {
    const prev = reviews[i + 1]
    if (!prev || r.compliance_score == null || prev.compliance_score == null) return null
    return r.compliance_score - prev.compliance_score
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Historical Reviews</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Every audit performed, with score trends between reviews.</p>
      </div>

      <AuditTabs />

      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
          <p className="text-[14px] font-semibold text-foreground">No audit history yet</p>
          <p className="mt-1 text-[13px] text-muted-foreground">Completed audits will appear here for comparison over time.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  {['Date', 'Title', 'Reviewer', 'Score', 'Trend', 'Findings', 'Status', ''].map((h) => (
                    <th key={h} className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {reviews.map((r, i) => {
                  const score = r.compliance_score ?? 0
                  const band = complianceBand(score)
                  const delta = deltas[i]
                  return (
                    <tr key={r.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-5 py-3 text-[12px] tabular-nums text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3 text-[13px] font-medium text-foreground">{r.title}</td>
                      <td className="px-5 py-3 text-[12px] text-muted-foreground">{r.reviewer_name ?? '—'}</td>
                      <td className="px-5 py-3"><span className="text-[15px] font-bold" style={{ color: BAND_COLORS[band] }}>{score}</span></td>
                      <td className="px-5 py-3"><TrendCell delta={delta} /></td>
                      <td className="px-5 py-3 text-[13px] tabular-nums text-foreground">{r.findings_count}</td>
                      <td className="px-5 py-3"><span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold capitalize text-muted-foreground">{r.status.replaceAll('_', ' ')}</span></td>
                      <td className="px-5 py-3"><Link href={`/audit-report/${r.id}`} className="text-[12px] font-medium text-primary hover:opacity-80">View →</Link></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function TrendCell({ delta }: { delta: number | null }) {
  if (delta == null) return <span className="text-[12px] text-muted-foreground">—</span>
  if (delta > 0) return <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-status-ok"><TrendingUp className="h-3.5 w-3.5" /> +{delta}</span>
  if (delta < 0) return <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-status-error"><TrendingDown className="h-3.5 w-3.5" /> {delta}</span>
  return <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-muted-foreground"><Minus className="h-3.5 w-3.5" /> 0</span>
}
