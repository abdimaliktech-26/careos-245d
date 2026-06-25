import Link from 'next/link'
import { Pill, PackageCheck, RefreshCw, AlertTriangle, ClipboardPlus } from 'lucide-react'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { runComplianceScan } from '@/lib/medications/compliance'

/**
 * Dashboard summary of medication + pharmacy activity for the org:
 * compliance score, doses due today, pending pharmacy orders, open refills,
 * and risk counts. Each tile links into the relevant module.
 */
export async function PharmacySummaryWidget({ organizationId }: { organizationId: string }) {
  const supabase = await createServerClient()
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end = new Date(); end.setHours(23, 59, 59, 999)

  const [{ widgets }, dueToday, openRefills] = await Promise.all([
    runComplianceScan(organizationId),
    supabase
      .from('medication_pass_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .gte('due_at', start.toISOString())
      .lte('due_at', end.toISOString()),
    supabase
      .from('refill_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'requested'),
  ])

  const tiles = [
    { label: 'Compliance', value: `${widgets.complianceScore}%`, href: '/medication-compliance', icon: Pill, accent: widgets.complianceScore >= 90 ? 'text-status-ok' : widgets.complianceScore >= 75 ? 'text-status-warn' : 'text-status-error' },
    { label: 'Doses due today', value: dueToday.count ?? 0, href: '/medication-pass', icon: ClipboardPlus, accent: 'text-foreground' },
    { label: 'Pending orders', value: widgets.pendingOrders, href: '/pharmacy-orders', icon: PackageCheck, accent: widgets.pendingOrders > 0 ? 'text-status-warn' : 'text-foreground' },
    { label: 'Open refills', value: openRefills.count ?? 0, href: '/refills', icon: RefreshCw, accent: 'text-foreground' },
    { label: 'Refill risks', value: widgets.refillRisks, href: '/medication-compliance', icon: AlertTriangle, accent: widgets.refillRisks > 0 ? 'text-status-warn' : 'text-foreground' },
    { label: 'Missing orders', value: widgets.missingOrders, href: '/medication-compliance', icon: AlertTriangle, accent: widgets.missingOrders > 0 ? 'text-status-error' : 'text-foreground' },
  ]

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill className="h-4 w-4 text-primary" />
          <h2 className="text-[15px] font-bold text-foreground">Medications & Pharmacy</h2>
        </div>
        <Link href="/medication-pass" className="text-[12px] font-semibold text-primary hover:underline">Open medication pass →</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="rounded-lg border border-border bg-background p-3 transition-shadow hover:shadow-sm">
            <t.icon className="mb-1.5 h-4 w-4 text-muted-foreground" />
            <p className={`text-xl font-bold ${t.accent}`}>{t.value}</p>
            <p className="text-[11px] font-medium text-muted-foreground">{t.label}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
