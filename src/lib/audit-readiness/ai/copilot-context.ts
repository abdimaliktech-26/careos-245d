import { createClient } from '@/lib/supabase/server'
import { analyzeClientDocumentation } from '../client-risk'
import { analyzeStaffCompliance } from '../staff-risk'
import { getAuditCounts, combineMetrics } from '../metrics'

/**
 * Build a compact, factual context block from real organization data so the
 * Audit Copilot answers from the platform rather than guessing. Lengths are
 * capped to keep the prompt small.
 */
export async function buildCopilotContext(organizationId: string): Promise<string> {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const [counts, clientRisks, staffResult, { data: overdue }] = await Promise.all([
    getAuditCounts(organizationId),
    analyzeClientDocumentation(organizationId),
    analyzeStaffCompliance(organizationId),
    supabase
      .from('packets')
      .select('packet_type, due_date, clients(legal_name)')
      .eq('organization_id', organizationId)
      .neq('status', 'completed')
      .lt('due_date', today)
      .order('due_date', { ascending: true })
      .limit(10),
  ])

  const metrics = combineMetrics(counts, clientRisks, staffResult)
  const topRisks = clientRisks.filter((c) => c.gaps.length > 0).slice(0, 8)

  const lines: string[] = []
  lines.push('ORGANIZATION AUDIT DATA (use this to answer; do not invent data):')
  lines.push(
    `Metrics: ${metrics.totalClients} clients (${metrics.activeClients} active), ` +
    `${metrics.missingDocuments} missing documents, ${metrics.expiredDocuments} expired documents, ` +
    `${metrics.upcomingReviewsDue} reviews due soon, ${metrics.staffTrainingExpiring} staff trainings expiring, ` +
    `${metrics.openIncidents} open incidents, ${metrics.complianceAlerts} compliance alerts.`,
  )

  if (topRisks.length > 0) {
    lines.push('Highest-risk clients:')
    for (const c of topRisks) {
      lines.push(`- ${c.clientName} (${c.program}, score ${c.score}, ${c.riskLevel}): ${c.gaps.map((g) => g.label).join('; ')}`)
    }
  }

  if (staffResult.upcomingExpirations.length > 0) {
    lines.push('Upcoming staff expirations (30 days):')
    for (const e of staffResult.upcomingExpirations.slice(0, 8)) {
      lines.push(`- ${e.name}: ${e.item} expires ${e.expiresOn} (${e.daysUntil}d)`)
    }
  }
  if (!staffResult.hasDesignatedCoordinator) lines.push('WARNING: No Designated Coordinator on record.')
  if (!staffResult.hasDesignatedManager) lines.push('WARNING: No Designated Manager on record.')

  const overdueRows = (overdue ?? []) as unknown as Array<{ packet_type: string; due_date: string; clients: { legal_name: string } | Array<{ legal_name: string }> | null }>
  if (overdueRows.length > 0) {
    lines.push('Overdue reviews:')
    for (const p of overdueRows) {
      const client = Array.isArray(p.clients) ? p.clients[0] : p.clients
      lines.push(`- ${client?.legal_name ?? 'Unknown'}: ${p.packet_type.replaceAll('_', ' ')} due ${p.due_date}`)
    }
  }

  return lines.join('\n')
}
