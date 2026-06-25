import { createClient as createServerClient } from '@/lib/supabase/server'
import type { MedAlertType } from '@/types/app'

export type LiveAlert = {
  type: MedAlertType
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  detail: string | null
}

export type ComplianceWidgets = {
  complianceScore: number
  missedThisMonth: number
  refillRisks: number
  pendingOrders: number
  expiredMeds: number
  missingOrders: number
}

/**
 * Compute live medication-compliance signals for an org. Read-only and
 * idempotent — safe to run on every dashboard view. Scoped by RLS via the
 * server client (caller must be an org member).
 */
export async function runComplianceScan(
  organizationId: string
): Promise<{ alerts: LiveAlert[]; widgets: ComplianceWidgets }> {
  const supabase = await createServerClient()
  const today = new Date().toISOString().slice(0, 10)
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [medsRes, ordersRes, refillsRes, marRes] = await Promise.all([
    supabase
      .from('medications')
      .select('id, name, status, end_date, physician_order_document_id, is_controlled')
      .eq('organization_id', organizationId)
      .eq('status', 'active'),
    supabase
      .from('medication_orders')
      .select('id, status')
      .eq('organization_id', organizationId)
      .in('status', ['submitted', 'pending_review']),
    supabase
      .from('refill_requests')
      .select('id, days_remaining, status')
      .eq('organization_id', organizationId)
      .not('status', 'in', '(filled,shipped,delivered,denied)'),
    supabase
      .from('medication_administration_records')
      .select('status, administered_at')
      .eq('organization_id', organizationId)
      .gte('administered_at', monthStart.toISOString()),
  ])

  const meds = medsRes.data ?? []
  const orders = ordersRes.data ?? []
  const refills = refillsRes.data ?? []
  const mar = marRes.data ?? []

  const expired = meds.filter((m) => m.end_date && m.end_date < today)
  const missingOrder = meds.filter((m) => !m.physician_order_document_id)
  const refillRisk = refills.filter((r) => (r.days_remaining ?? 99) <= 10)

  const missedThisMonth = mar.filter((r) => r.status === 'missed').length
  const lateThisMonth = mar.filter((r) => r.status === 'late').length
  const givenThisMonth = mar.filter((r) => r.status === 'given').length
  const totalActionable = givenThisMonth + missedThisMonth + lateThisMonth
  const complianceScore = totalActionable === 0
    ? 100
    : Math.round((givenThisMonth / totalActionable) * 100)

  const alerts: LiveAlert[] = []
  for (const m of expired) {
    alerts.push({ type: 'expired_medication', severity: 'high', title: `Expired medication: ${m.name}`, detail: `Ended ${m.end_date} but still marked active.` })
  }
  for (const m of missingOrder) {
    alerts.push({
      type: 'missing_physician_order',
      severity: m.is_controlled ? 'critical' : 'medium',
      title: `Missing physician order: ${m.name}`,
      detail: m.is_controlled ? 'Controlled substance without an attached physician order.' : 'No physician order document attached.',
    })
  }
  for (const r of refillRisk) {
    alerts.push({ type: 'refill_risk', severity: (r.days_remaining ?? 0) <= 3 ? 'high' : 'medium', title: 'Refill running low', detail: `${r.days_remaining ?? 0} days remaining.` })
  }
  if (orders.length > 0) {
    alerts.push({ type: 'order_not_reviewed', severity: 'medium', title: `${orders.length} pharmacy order(s) awaiting review`, detail: 'Review and approve to update the MAR.' })
  }
  if (missedThisMonth > 0) {
    alerts.push({ type: 'missed_medication', severity: missedThisMonth >= 5 ? 'high' : 'medium', title: `${missedThisMonth} missed dose(s) this month`, detail: 'Review missed medication report.' })
  }

  return {
    alerts,
    widgets: {
      complianceScore,
      missedThisMonth,
      refillRisks: refillRisk.length,
      pendingOrders: orders.length,
      expiredMeds: expired.length,
      missingOrders: missingOrder.length,
    },
  }
}
