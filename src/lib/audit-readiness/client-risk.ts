import { createClient } from '@/lib/supabase/server'
import { getPacketCompliance } from '@/lib/packets/compliance'
import { scoreFromGaps, riskFromScore, type AuditRiskLevel } from './score'

export type GapCode =
  | 'missing_intake'
  | 'missing_annual_review'
  | 'missing_semi_annual_review'
  | 'missing_45_day_review'
  | 'missing_signatures'
  | 'missing_support_plan'
  | 'expired_assessment'
  | 'incomplete_service_agreement'

export interface ClientGap {
  code: GapCode
  label: string
  risk: AuditRiskLevel
}

export interface ClientRisk {
  clientId: string
  clientName: string
  program: string
  status: string
  gaps: ClientGap[]
  score: number
  riskLevel: AuditRiskLevel
}

/** Minimal packet shape the pure evaluator needs. */
export interface PacketLite {
  packet_type: string
  status: string
  due_date: string | null
  hasRequiredSignatures: boolean
}

/** Service-plan shape the pure evaluator needs (null when the client has none). */
export interface ServicePlanLite {
  status: string
  review_date: string | null
  annual_review_date: string | null
}

const REQUIRED_PACKETS: ReadonlyArray<{ type: string; code: GapCode; label: string; risk: AuditRiskLevel }> = [
  { type: 'intake',              code: 'missing_intake',              label: 'Missing intake documentation',  risk: 'high' },
  { type: 'annual_review',       code: 'missing_annual_review',       label: 'Missing annual review',          risk: 'high' },
  { type: 'semi_annual_review',  code: 'missing_semi_annual_review',  label: 'Missing semi-annual review',     risk: 'moderate' },
  { type: '45_day_review',       code: 'missing_45_day_review',       label: 'Missing 45-day review',          risk: 'moderate' },
]

/**
 * Pure gap evaluation for one client. A required review counts as a gap when no
 * packet of that type exists, or the most relevant one is overdue/unsigned.
 */
export function evaluateClientGaps(
  packets: ReadonlyArray<PacketLite>,
  servicePlan: ServicePlanLite | null,
  now: Date = new Date(),
): ClientGap[] {
  const gaps: ClientGap[] = []

  for (const req of REQUIRED_PACKETS) {
    const matching = packets.filter((p) => p.packet_type === req.type)
    if (matching.length === 0) {
      gaps.push({ code: req.code, label: req.label, risk: req.risk })
      continue
    }
    const allOverdue = matching.every(
      (p) => getPacketCompliance(p.due_date, p.status, now).level === 'overdue',
    )
    if (allOverdue) {
      gaps.push({ code: req.code, label: `${req.label} (overdue)`, risk: req.risk })
    }
  }

  // Signature gaps: any packet that should be signed but is not.
  const unsigned = packets.some(
    (p) => (p.status === 'completed' || p.status === 'needs_signature') && !p.hasRequiredSignatures,
  )
  if (unsigned) {
    gaps.push({ code: 'missing_signatures', label: 'Missing required signatures', risk: 'high' })
  }

  // Support plan / service agreement gaps.
  if (!servicePlan) {
    gaps.push({ code: 'missing_support_plan', label: 'No active support plan', risk: 'high' })
  } else {
    if (servicePlan.status === 'draft') {
      gaps.push({ code: 'incomplete_service_agreement', label: 'Incomplete service agreement', risk: 'moderate' })
    }
    const reviewDue = servicePlan.annual_review_date ?? servicePlan.review_date
    if (servicePlan.status === 'expired' || (reviewDue && new Date(reviewDue) < now)) {
      gaps.push({ code: 'expired_assessment', label: 'Expired assessment / overdue plan review', risk: 'moderate' })
    }
  }

  return gaps
}

/** Build a full ClientRisk record from gaps + identity. */
export function toClientRisk(
  identity: { clientId: string; clientName: string; program: string; status: string },
  gaps: ClientGap[],
): ClientRisk {
  const score = scoreFromGaps(gaps)
  return { ...identity, gaps, score, riskLevel: riskFromScore(score) }
}

/** Fetch + analyze documentation risk for every active-ish client in an org. */
export async function analyzeClientDocumentation(organizationId: string): Promise<ClientRisk[]> {
  const supabase = await createClient()

  const [{ data: clients }, { data: packets }, { data: signatures }, { data: plans }] = await Promise.all([
    supabase.from('clients').select('id, legal_name, program, status').eq('organization_id', organizationId),
    supabase.from('packets').select('id, client_id, packet_type, status, due_date').eq('organization_id', organizationId),
    supabase.from('signatures').select('packet_id').eq('organization_id', organizationId),
    supabase.from('service_plans').select('client_id, status, review_date, annual_review_date').eq('organization_id', organizationId),
  ])

  const signedPacketIds = new Set((signatures ?? []).map((s) => (s as { packet_id: string }).packet_id))
  const planByClient = new Map<string, ServicePlanLite>()
  for (const p of (plans ?? []) as Array<{ client_id: string; status: string; review_date: string | null; annual_review_date: string | null }>) {
    // Keep the most "complete" plan per client (active over draft/expired).
    const existing = planByClient.get(p.client_id)
    if (!existing || (existing.status !== 'active' && p.status === 'active')) {
      planByClient.set(p.client_id, { status: p.status, review_date: p.review_date, annual_review_date: p.annual_review_date })
    }
  }

  const packetsByClient = new Map<string, PacketLite[]>()
  for (const p of (packets ?? []) as Array<{ id: string; client_id: string; packet_type: string; status: string; due_date: string | null }>) {
    const list = packetsByClient.get(p.client_id) ?? []
    list.push({
      packet_type: p.packet_type,
      status: p.status,
      due_date: p.due_date,
      hasRequiredSignatures: signedPacketIds.has(p.id),
    })
    packetsByClient.set(p.client_id, list)
  }

  const now = new Date()
  const results: ClientRisk[] = []
  for (const c of (clients ?? []) as Array<{ id: string; legal_name: string; program: string; status: string }>) {
    if (c.status === 'discharged') continue
    const gaps = evaluateClientGaps(packetsByClient.get(c.id) ?? [], planByClient.get(c.id) ?? null, now)
    results.push(
      toClientRisk(
        { clientId: c.id, clientName: c.legal_name, program: c.program, status: c.status },
        gaps,
      ),
    )
  }

  return results.sort((a, b) => a.score - b.score)
}
