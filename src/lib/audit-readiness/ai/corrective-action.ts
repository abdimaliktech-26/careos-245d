import { z } from 'zod'
import { runAiObject } from '@/lib/ai/gateway'
import { extractJson } from './json'
import { gapRecommendation } from '../recommendations'
import type { GapCode } from '../client-risk'
import type { AuditRiskLevel } from '../score'

export interface FindingInput {
  finding: string
  riskLevel: AuditRiskLevel
  regulationCategory?: string
  /** Optional gap code to drive the deterministic fallback. */
  code?: GapCode
  subject?: string
}

export interface GeneratedCap {
  finding: string
  riskLevel: AuditRiskLevel
  regulationCategory: string
  correctiveAction: string
  responsiblePerson: string
  dueInDays: number
}

const AI_FEATURE = 'audit_readiness'
const DEFAULT_DUE_DAYS: Record<AuditRiskLevel, number> = { high: 14, moderate: 30, low: 60 }

const capSchema = z.array(
  z.object({
    finding: z.string(),
    riskLevel: z.enum(['high', 'moderate', 'low']),
    regulationCategory: z.string(),
    correctiveAction: z.string(),
    responsiblePerson: z.string(),
    dueInDays: z.number().int().positive().max(180),
  }),
)

/** Deterministic CAP rows derived from each finding (always available). */
export function deterministicCaps(findings: ReadonlyArray<FindingInput>): GeneratedCap[] {
  return findings.map((f) => {
    const rec = f.code ? gapRecommendation(f.code) : null
    return {
      finding: f.finding,
      riskLevel: f.riskLevel,
      regulationCategory: f.regulationCategory ?? rec?.regulation ?? '245D General',
      correctiveAction: rec?.action ?? 'Review and remediate this compliance gap; document the resolution.',
      responsiblePerson: f.riskLevel === 'high' ? 'Designated Coordinator' : 'Program Manager',
      dueInDays: DEFAULT_DUE_DAYS[f.riskLevel],
    }
  })
}

/**
 * Generate corrective action plan rows. Uses the governed AI gateway when
 * available; otherwise returns deterministic rows. Never throws.
 */
export async function generateCorrectiveActions(
  findings: ReadonlyArray<FindingInput>,
  ctx: { organizationId: string; userId: string | null },
): Promise<{ caps: GeneratedCap[]; aiUsed: boolean }> {
  if (findings.length === 0) return { caps: [], aiUsed: false }

  const fallback = deterministicCaps(findings)
  const system =
    'You are a Minnesota 245D compliance consultant. For each audit finding, write a concise, ' +
    'actionable corrective action plan entry. Respond ONLY with a JSON array; each element must have ' +
    'finding, riskLevel (high|moderate|low), regulationCategory, correctiveAction, responsiblePerson, ' +
    'and dueInDays (integer days from today). Keep corrective actions specific and practical.'
  const prompt = JSON.stringify(
    findings.map((f) => ({ finding: f.finding, riskLevel: f.riskLevel, regulationCategory: f.regulationCategory ?? null, subject: f.subject ?? null })),
  )

  const res = await runAiObject<GeneratedCap[]>(
    { organizationId: ctx.organizationId, userId: ctx.userId, feature: AI_FEATURE, system, prompt },
    (text) => capSchema.parse(extractJson(text)),
  )

  if (!res.ok) return { caps: fallback, aiUsed: false }
  return { caps: res.data, aiUsed: true }
}
