import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'

type NotificationFinding = {
  id?: string
  severity?: string
  title?: string
  summary?: string
  nextAction?: string
  href?: string
  reportId: string
  reportScore: number | null
  createdAt: string | null
}

const SEVERITY_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  critical: { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500' },
  high:     { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  medium:   { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  low:      { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500' },
}

export default async function NotificationsPage() {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')
  if (!user.organizationId) redirect('/dashboard')

  const supabase = await createClient()
  const [{ data: reports }, { data: queued }] = await Promise.all([
    supabase
      .from('audit_reports')
      .select('id, score, counts, findings, source, created_at')
      .eq('organization_id', user.organizationId)
      .order('created_at', { ascending: false })
      .limit(10),
    ['org_admin', 'program_manager', 'super_admin'].includes(user.role)
      ? supabase
          .from('audit_notifications')
          .select('id, subject, message, severity, status, created_at')
          .eq('organization_id', user.organizationId)
          .order('created_at', { ascending: false })
          .limit(20)
      : { data: [] },
  ])

  const findings: NotificationFinding[] = (reports ?? []).flatMap((report: Record<string, unknown>) =>
    ((report.findings ?? []) as Array<Record<string, unknown>>).slice(0, 12).map((finding) => ({
      ...finding,
      reportId: String(report.id ?? ''),
      reportScore: typeof report.score === 'number' ? report.score : null,
      createdAt: typeof report.created_at === 'string' ? report.created_at : null,
    }))
  ).slice(0, 40)

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          In-App Alerts
        </p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">Notification Center</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Automated audit findings and queued alert messages — no email or SMS setup required.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* Audit findings */}
        <section
          className="overflow-hidden rounded-2xl border border-border bg-card"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          <div className="border-b border-border px-6 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">AI Analysis</p>
            <h2 className="mt-0.5 text-[13px] font-bold text-foreground">Audit Findings</h2>
          </div>

          {findings.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B99A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.6 4.8L18 9l-4.4 3.2L15 17l-3-2.2L9 17l1.4-4.8L6 9l4.4-1.2L12 3z"/>
                </svg>
              </div>
              <p className="text-[13px] font-semibold text-foreground">No audit findings yet</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Open AI Audit Assistant to run a compliance scan.
              </p>
              <Link
                href="/admin/audit-assistant"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand-from to-brand-to px-4 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Run Audit →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {findings.map((finding) => {
                const sev = String(finding.severity ?? 'low')
                const style = SEVERITY_STYLE[sev] ?? SEVERITY_STYLE.low
                return (
                  <div key={`${finding.reportId}-${finding.id ?? finding.title}`} className="px-6 py-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.04em] ${style.bg} ${style.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                        {sev}
                      </span>
                      {finding.createdAt && (
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(finding.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <h3 className="text-[13px] font-semibold text-foreground">{String(finding.title)}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{String(finding.summary)}</p>
                    {finding.nextAction && (
                      <p className="mt-2 text-[12px] font-semibold text-primary">→ {String(finding.nextAction)}</p>
                    )}
                    {finding.href && (
                      <Link
                        href={String(finding.href)}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand-from to-brand-to px-3.5 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        Review →
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Queued alerts */}
        <section
          className="rounded-2xl border border-border bg-card p-6"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Alert Queue</p>
          <h2 className="mt-0.5 text-[13px] font-bold text-foreground">Queued Alerts</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Stored in-app when external email/SMS providers are not configured.
          </p>

          <div className="mt-5 space-y-3">
            {!queued || queued.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-8 text-center">
                <p className="text-[12px] text-muted-foreground">No queued notifications.</p>
              </div>
            ) : queued.map((item: Record<string, unknown>) => {
              const sev = String(item.severity ?? 'low')
              const style = SEVERITY_STYLE[sev] ?? SEVERITY_STYLE.low
              return (
                <div key={item.id as string} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${style.bg} ${style.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                      {String(item.status)}
                    </span>
                    {!!item.created_at && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(item.created_at as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] font-semibold text-foreground">{String(item.subject ?? 'Audit alert')}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{String(item.message).slice(0, 180)}</p>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
