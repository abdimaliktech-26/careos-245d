import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { AuditTabs } from '@/components/audit-readiness/audit-tabs'
import { RiskBadge } from '@/components/audit-readiness/risk-badge'
import { CapStatusSelect, GenerateCapsButton } from '@/components/audit-readiness/cap-controls'
import type { AuditRiskLevel } from '@/lib/audit-readiness/score'

interface CapRow {
  id: string
  finding: string
  risk_level: AuditRiskLevel
  regulation_category: string | null
  corrective_action: string
  responsible_person: string | null
  due_date: string | null
  status: 'open' | 'in_progress' | 'complete'
}

export default async function CapsPage() {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')
  const organizationId = user.organizationId

  let caps: CapRow[] = []
  let latestReviewId: string | null = null

  if (organizationId) {
    const supabase = await createClient()
    const [{ data: capData }, { data: latest }] = await Promise.all([
      supabase
        .from('corrective_action_plans')
        .select('id, finding, risk_level, regulation_category, corrective_action, responsible_person, due_date, status')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false }),
      supabase
        .from('audit_reviews')
        .select('id')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])
    caps = (capData ?? []) as CapRow[]
    latestReviewId = latest?.id ?? null
  }

  const openCount = caps.filter((c) => c.status !== 'complete').length

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Corrective Action Plans</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            AI-generated corrective actions for audit findings. {openCount} open item{openCount !== 1 ? 's' : ''}.
          </p>
        </div>
        {latestReviewId && <GenerateCapsButton reviewId={latestReviewId} />}
      </div>

      <AuditTabs />

      {caps.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
          <p className="text-[14px] font-semibold text-foreground">No corrective action plans yet</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {latestReviewId
              ? 'Generate an action plan from your latest audit findings.'
              : <>Run the <Link href="/audit-readiness/wizard" className="text-primary">Audit Review Wizard</Link> first.</>}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  {['Finding', 'Risk', 'Regulation', 'Corrective Action', 'Responsible', 'Due', 'Status'].map((h) => (
                    <th key={h} className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {caps.map((c) => (
                  <tr key={c.id} className="align-top transition-colors hover:bg-muted/40">
                    <td className="px-5 py-3 text-[13px] font-medium text-foreground">{c.finding}</td>
                    <td className="px-5 py-3"><RiskBadge level={c.risk_level} /></td>
                    <td className="px-5 py-3 text-[12px] text-muted-foreground">{c.regulation_category ?? '—'}</td>
                    <td className="px-5 py-3 text-[12px] text-muted-foreground">{c.corrective_action}</td>
                    <td className="px-5 py-3 text-[12px] text-muted-foreground">{c.responsible_person ?? '—'}</td>
                    <td className="px-5 py-3 text-[12px] tabular-nums text-muted-foreground">{c.due_date ?? '—'}</td>
                    <td className="px-5 py-3"><CapStatusSelect capId={c.id} status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
