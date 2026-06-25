import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { HeartPulse } from 'lucide-react'
import { runComplianceScan } from '@/lib/medications/compliance'

export const dynamic = 'force-dynamic'

const SEV_STYLES: Record<string, string> = {
  critical: 'bg-status-error-bg text-status-error',
  high: 'bg-status-error-bg text-status-error',
  medium: 'bg-status-warn-bg text-status-warn',
  low: 'bg-muted text-muted-foreground',
}

export default async function MedicationCompliancePage() {
  const { user, error } = await getSession()
  if (error || !user?.organizationId) redirect('/auth/login')

  // Recompute live signals on view (idempotent, in-memory — see lib/medications/compliance).
  const { alerts, widgets } = await runComplianceScan(user.organizationId)
  const supabase = await createServerClient()
  const { data: stored } = await supabase
    .from('medication_compliance_alerts')
    .select('id, alert_type, severity, status, title, detail, detected_at')
    .eq('status', 'open')
    .order('detected_at', { ascending: false })
    .limit(50)

  const live = alerts
  const persisted = stored ?? []

  const cards = [
    { label: 'Compliance score', value: `${widgets.complianceScore}%` },
    { label: 'Missed this month', value: widgets.missedThisMonth },
    { label: 'Refill risks', value: widgets.refillRisks },
    { label: 'Pending pharmacy orders', value: widgets.pendingOrders },
    { label: 'Expired medications', value: widgets.expiredMeds },
    { label: 'Missing physician order', value: widgets.missingOrders },
  ]

  return (
    <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-from to-brand-to text-white"><HeartPulse className="h-5 w-5" /></span>
        <div>
          <h1 className="text-xl font-bold text-foreground">Medication Compliance</h1>
          <p className="text-[13px] text-muted-foreground">Live medication risk signals across your organization.</p>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-[12px] font-medium text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{c.value}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-2 text-[14px] font-bold text-foreground">Active alerts</h2>
      {live.length === 0 && persisted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-[13px] text-muted-foreground">
          No active medication compliance issues. 🎉
        </div>
      ) : (
        <div className="space-y-2">
          {live.map((a, i) => (
            <div key={`live-${i}`} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
              <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${SEV_STYLES[a.severity] ?? SEV_STYLES.low}`}>{a.severity}</span>
              <div>
                <p className="text-[14px] font-semibold text-foreground">{a.title}</p>
                {a.detail && <p className="text-[12px] text-muted-foreground">{a.detail}</p>}
              </div>
            </div>
          ))}
          {persisted.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
              <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${SEV_STYLES[a.severity] ?? SEV_STYLES.low}`}>{a.severity}</span>
              <div>
                <p className="text-[14px] font-semibold text-foreground">{a.title}</p>
                {a.detail && <p className="text-[12px] text-muted-foreground">{a.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
