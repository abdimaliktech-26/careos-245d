import { createClient } from '@/lib/supabase/server'
import type { ClientRisk } from './client-risk'
import type { StaffComplianceResult } from './staff-risk'

/** Cheap count-based metrics pulled directly from Supabase. */
export interface AuditCounts {
  totalClients: number
  activeClients: number
  filesReviewed: number
  upcomingReviewsDue: number
  openIncidents: number
  staffTrainingExpiring: number
}

/** Full executive metric set rendered on the dashboard. */
export interface AuditMetrics extends AuditCounts {
  missingDocuments: number
  expiredDocuments: number
  complianceAlerts: number
}

const UPCOMING_WINDOW_DAYS = 30

function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export async function getAuditCounts(organizationId: string): Promise<AuditCounts> {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)
  const horizon = isoDaysFromNow(UPCOMING_WINDOW_DAYS)

  const [
    { count: totalClients },
    { count: activeClients },
    { count: filesReviewed },
    { count: upcomingReviewsDue },
    { count: openIncidents },
    { count: staffTrainingExpiring },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'active'),
    supabase.from('packets').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'completed'),
    supabase.from('packets').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).neq('status', 'completed').gte('due_date', today).lte('due_date', horizon),
    supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).neq('status', 'closed'),
    supabase.from('staff_trainings').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).in('status', ['expiring_soon', 'expired', 'not_completed']),
  ])

  return {
    totalClients: totalClients ?? 0,
    activeClients: activeClients ?? 0,
    filesReviewed: filesReviewed ?? 0,
    upcomingReviewsDue: upcomingReviewsDue ?? 0,
    openIncidents: openIncidents ?? 0,
    staffTrainingExpiring: staffTrainingExpiring ?? 0,
  }
}

/** Pure: derive the missing/expired/alert metrics from analyzed risk data. */
export function combineMetrics(
  counts: AuditCounts,
  clientRisks: ReadonlyArray<ClientRisk>,
  staff: Pick<StaffComplianceResult, 'highRisk'>,
): AuditMetrics {
  let missingDocuments = 0
  let expiredDocuments = 0
  for (const c of clientRisks) {
    for (const g of c.gaps) {
      if (g.code.startsWith('missing_')) missingDocuments += 1
      if (g.code.startsWith('expired_') || g.code === 'expired_assessment') expiredDocuments += 1
    }
  }
  const highRiskClients = clientRisks.filter((c) => c.riskLevel === 'high').length
  const complianceAlerts = highRiskClients + staff.highRisk.length + counts.openIncidents

  return { ...counts, missingDocuments, expiredDocuments, complianceAlerts }
}
