'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { logAuditEvent } from '@/lib/audit/log'
import { analyzeClientDocumentation } from './client-risk'
import { analyzeStaffCompliance } from './staff-risk'
import { getAuditCounts, combineMetrics } from './metrics'
import { gapRecommendation } from './recommendations'
import { weightedOverall } from './score'
import { generateCorrectiveActions, type FindingInput } from './ai/corrective-action'

type ActionResult<T> = { data: T; error: null } | { data: null; error: string }

interface FindingRow {
  organization_id: string
  audit_review_id: string
  client_id: string | null
  staff_id: string | null
  category: string
  regulation_category: string | null
  risk_level: 'high' | 'moderate' | 'low'
  finding: string
  recommended_action: string | null
}

/**
 * Run the full compliance analysis, persist an audit_reviews row plus its
 * findings, and return the new review id. The wizard calls this at the final step.
 */
export async function createAuditReview(input: {
  title?: string
  programs?: string[]
  notes?: string
  packageTier?: string
}): Promise<ActionResult<{ id: string; score: number }>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { data: null, error: 'Unauthorized' }
  const organizationId = user.organizationId

  const supabase = await createServerClient()

  const [counts, clientRisks, staffResult] = await Promise.all([
    getAuditCounts(organizationId),
    analyzeClientDocumentation(organizationId),
    analyzeStaffCompliance(organizationId),
  ])
  const metrics = combineMetrics(counts, clientRisks, staffResult)

  const clientAvg = clientRisks.length === 0 ? 100 : Math.round(clientRisks.reduce((s, c) => s + c.score, 0) / clientRisks.length)
  const overallScore = weightedOverall([
    { score: clientAvg, weight: 2 },
    { score: staffResult.averageScore, weight: 1 },
  ])

  const { data: review, error: reviewError } = await supabase
    .from('audit_reviews')
    .insert({
      organization_id: organizationId,
      reviewer_id: user.id,
      reviewer_name: user.fullName,
      title: input.title?.trim() || 'Audit Readiness Review',
      scope: { programs: input.programs ?? [], notes: input.notes ?? '' },
      status: 'in_progress',
      compliance_score: overallScore,
      package_tier: input.packageTier ?? null,
    })
    .select('id')
    .single()

  if (reviewError || !review) return { data: null, error: reviewError?.message ?? 'Failed to create review' }

  const findingRows: FindingRow[] = []
  for (const c of clientRisks) {
    for (const g of c.gaps) {
      const rec = gapRecommendation(g.code)
      findingRows.push({
        organization_id: organizationId,
        audit_review_id: review.id,
        client_id: c.clientId,
        staff_id: null,
        category: 'client_documentation',
        regulation_category: rec.regulation,
        risk_level: g.risk,
        finding: `${c.clientName}: ${g.label}`,
        recommended_action: rec.action,
      })
    }
  }
  for (const s of staffResult.staff) {
    for (const g of s.gaps) {
      findingRows.push({
        organization_id: organizationId,
        audit_review_id: review.id,
        client_id: null,
        staff_id: s.staffId,
        category: 'staff_compliance',
        regulation_category: '245D.09 Staff Qualifications & Training',
        risk_level: g.risk,
        finding: `${s.name}: ${g.label}`,
        recommended_action: 'Bring the staff record into compliance and file supporting documentation.',
      })
    }
  }

  if (findingRows.length > 0) {
    await supabase.from('audit_findings').insert(findingRows)
  }

  await supabase
    .from('audit_reviews')
    .update({ findings_count: findingRows.length, status: 'complete', completed_at: new Date().toISOString(), summary: `${metrics.missingDocuments} missing document(s), ${metrics.complianceAlerts} alert(s).` })
    .eq('id', review.id)
    .eq('organization_id', organizationId)

  await logAuditEvent({ user, action: 'audit_review_created', entityType: 'audit_review', entityId: review.id, entityLabel: input.title ?? 'Audit Readiness Review' })

  revalidatePath('/audit-readiness/history')
  revalidatePath('/audit-readiness')
  return { data: { id: review.id, score: overallScore }, error: null }
}

/** Generate corrective action plan rows for a review (AI when available). */
export async function generateCapsForReview(reviewId: string): Promise<ActionResult<{ count: number; aiUsed: boolean }>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { data: null, error: 'Unauthorized' }
  const organizationId = user.organizationId
  const supabase = await createServerClient()

  const { data: findings } = await supabase
    .from('audit_findings')
    .select('id, finding, risk_level, regulation_category, category')
    .eq('audit_review_id', reviewId)
    .eq('organization_id', organizationId)

  const findingList = (findings ?? []) as Array<{ id: string; finding: string; risk_level: 'high' | 'moderate' | 'low'; regulation_category: string | null }>
  if (findingList.length === 0) return { data: { count: 0, aiUsed: false }, error: null }

  const inputs: FindingInput[] = findingList.map((f) => ({
    finding: f.finding,
    riskLevel: f.risk_level,
    regulationCategory: f.regulation_category ?? undefined,
  }))

  const { caps, aiUsed } = await generateCorrectiveActions(inputs, { organizationId, userId: user.id })

  const now = Date.now()
  const rows = caps.map((cap, i) => ({
    audit_review_id: reviewId,
    organization_id: organizationId,
    finding_id: findingList[i]?.id ?? null,
    finding: cap.finding,
    risk_level: cap.riskLevel,
    regulation_category: cap.regulationCategory,
    corrective_action: cap.correctiveAction,
    responsible_person: cap.responsiblePerson,
    due_date: new Date(now + cap.dueInDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: 'open' as const,
  }))

  const { error } = await supabase.from('corrective_action_plans').insert(rows)
  if (error) return { data: null, error: error.message }

  revalidatePath('/audit-readiness/caps')
  return { data: { count: rows.length, aiUsed }, error: null }
}

/** Update the tracking status of a single corrective action plan item. */
export async function updateCapStatus(capId: string, status: 'open' | 'in_progress' | 'complete'): Promise<ActionResult<{ id: string }>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { data: null, error: 'Unauthorized' }
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('corrective_action_plans')
    .update({ status, completed_at: status === 'complete' ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    .eq('id', capId)
    .eq('organization_id', user.organizationId)

  if (error) return { data: null, error: error.message }
  revalidatePath('/audit-readiness/caps')
  return { data: { id: capId }, error: null }
}
