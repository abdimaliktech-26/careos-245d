import { generateText, type LanguageModel } from 'ai'
import { z } from 'zod'
import { aiModel } from '@/lib/ai/provider'
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
 * Best-effort AI enrichment. Follows the repo's generateText + parse pattern.
 * Sends only minimum-necessary structured fields (no raw PHI free-text). The
 * model never changes the verdict. Throws on bad output; the pipeline swallows.
 */
export async function enrichRun(
  run: ValidationRun,
  opts: { model?: LanguageModel } = {},
): Promise<EnrichResult> {
  const { text, response } = await generateText({
    model: opts.model ?? aiModel,
    system: SYSTEM,
    prompt: JSON.stringify({
      subjectType: run.subjectType,
      verdict: run.verdict,
      checks: run.checks,
      flags: run.flags,
      programRecommendation: run.programRecommendation,
    }),
  })

  const parsed = parseEnrichResponse(text)
  return { ...parsed, modelId: response?.modelId ?? null }
}
