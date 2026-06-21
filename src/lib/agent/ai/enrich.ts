import { z } from 'zod'
import { runAiText } from '@/lib/ai/gateway'
import type { ValidationRun } from '../types'

const enrichSchema = z.object({
  summary: z.string().max(800),
  anomalies: z.array(z.object({
    code: z.string().max(60),
    message: z.string().max(300),
  })).max(10),
})

export type EnrichOutput = z.infer<typeof enrichSchema>
export type EnrichResult = EnrichOutput & { modelId: string | null }

/** Pure: validate/parse a model's JSON text into structured enrichment. Throws on bad output. */
export function parseEnrichResponse(text: string): EnrichOutput {
  return enrichSchema.parse(JSON.parse(text))
}

const SYSTEM =
  'You are a compliance assistant for a Minnesota 245D home-care intake/EVV system. ' +
  'Explain validation results in plain English for staff. Do not invent facts. ' +
  'Only report anomalies clearly implied by the provided checks and flags. ' +
  'Respond with ONLY a JSON object: {"summary": string, "anomalies": [{"code": string, "message": string}]}.'

/**
 * Best-effort AI enrichment through the governed gateway. Returns `{ disabled: true }`
 * when AI is off/limited/unconfigured/errored — callers degrade gracefully.
 */
export async function enrichRun(
  run: ValidationRun,
  ctx: { organizationId: string; userId: string | null },
): Promise<EnrichResult | { disabled: true }> {
  const res = await runAiText({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    feature: 'agent_enrich',
    system: SYSTEM,
    prompt: JSON.stringify({
      subjectType: run.subjectType,
      verdict: run.verdict,
      checks: run.checks,
      flags: run.flags,
      programRecommendation: run.programRecommendation,
    }),
  })
  if (!res.ok) return { disabled: true }
  try {
    return { ...parseEnrichResponse(res.text), modelId: res.model }
  } catch {
    return { disabled: true }
  }
}
