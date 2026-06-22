import { z } from 'zod'
import { runAiObject } from '@/lib/ai/gateway'
import { extractJson } from './json'
import { complianceBand, BAND_LABELS } from '../score'

export interface ReportNarrativeInput {
  organizationName: string
  overallScore: number
  totalClients: number
  highRiskCount: number
  missingDocuments: number
  openIncidents: number
  topFindings: ReadonlyArray<string>
}

export interface ReportNarrative {
  executiveSummary: string
  recommendations: string[]
}

const AI_FEATURE = 'audit_readiness'

const narrativeSchema = z.object({
  executiveSummary: z.string(),
  recommendations: z.array(z.string()).min(1),
})

/** Deterministic narrative used when AI is unavailable. */
export function deterministicNarrative(input: ReportNarrativeInput): ReportNarrative {
  const band = complianceBand(input.overallScore)
  const executiveSummary =
    `${input.organizationName} achieved an overall audit readiness score of ${input.overallScore}/100 ` +
    `(${BAND_LABELS[band]}). The review covered ${input.totalClients} client file(s) and identified ` +
    `${input.missingDocuments} missing document(s), ${input.highRiskCount} high-risk client(s), and ` +
    `${input.openIncidents} open incident(s). Addressing the highest-risk findings below will materially ` +
    `improve licensing and payer audit outcomes.`
  const recommendations = [
    'Prioritize remediation of all high-risk client documentation gaps before any scheduled review.',
    'Complete outstanding annual, semi-annual, and 45-day reviews and obtain required signatures.',
    'Verify staff training, CPR/First Aid, and background study currency for all active staff.',
    'Close or document resolution for all open incidents per 245D reporting timelines.',
  ]
  return { executiveSummary, recommendations }
}

/** Generate the report narrative via the governed AI gateway; falls back cleanly. */
export async function generateReportNarrative(
  input: ReportNarrativeInput,
  ctx: { organizationId: string; userId: string | null },
): Promise<{ narrative: ReportNarrative; aiUsed: boolean }> {
  const fallback = deterministicNarrative(input)
  const system =
    'You are a Minnesota 245D compliance auditor writing a professional audit readiness report. ' +
    'Respond ONLY with JSON: { "executiveSummary": string, "recommendations": string[] }. ' +
    'The executive summary should be 2-4 sentences, factual and professional. Provide 3-6 prioritized recommendations.'
  const prompt = JSON.stringify(input)

  const res = await runAiObject<ReportNarrative>(
    { organizationId: ctx.organizationId, userId: ctx.userId, feature: AI_FEATURE, system, prompt },
    (text) => narrativeSchema.parse(extractJson(text)),
  )

  if (!res.ok) return { narrative: fallback, aiUsed: false }
  return { narrative: res.data, aiUsed: true }
}
