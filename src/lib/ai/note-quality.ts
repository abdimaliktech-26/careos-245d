export interface NoteQualityInput {
  noteText: string
  serviceType: string | null
}

export interface NoteQualityResult {
  score: number
  issues: string[]
  strengths: string[]
}

export const NOTE_QUALITY_SYSTEM_PROMPT = `You are a 245D documentation compliance reviewer. Score a progress note for billing and audit readiness.

A billable, audit-ready note typically includes: date/time of service, services provided tied to the support plan, client response/outcome, staff observations, and objective language.

Respond with ONLY a JSON object, no markdown, in this exact shape:
{"score": <0-100 integer>, "issues": ["<specific missing element or problem>"], "strengths": ["<what the note does well>"]}

Be specific in issues (e.g. "No start/end time documented"), max 5 issues and 3 strengths.`

export function buildNoteQualityPrompt(input: NoteQualityInput): string {
  return [
    `Service type: ${input.serviceType ?? 'unspecified'}`,
    '',
    'Progress note to review:',
    input.noteText,
  ].join('\n')
}

export function parseNoteQualityResponse(raw: string): NoteQualityResult | null {
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null
  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      score?: unknown
      issues?: unknown
      strengths?: unknown
    }
    if (typeof parsed.score !== 'number') return null
    return {
      score: Math.min(100, Math.max(0, Math.round(parsed.score))),
      issues: Array.isArray(parsed.issues) ? parsed.issues.map(String).slice(0, 5) : [],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String).slice(0, 3) : [],
    }
  } catch {
    return null
  }
}
