export interface IncidentClassifyInput {
  description: string
  category: string | null
}

export type IncidentSeverity = 'minor' | 'moderate' | 'serious' | 'review'

export interface IncidentClassifyResult {
  severity: IncidentSeverity
  mandatoryReporting: boolean
  rationale: string
  deadlineNote: string | null
}

export const INCIDENT_CLASSIFY_SYSTEM_PROMPT = `You are a Minnesota 245D incident triage assistant. Given an incident description, suggest severity and whether it may meet mandatory reporting thresholds (vulnerable adult maltreatment, serious injury, emergency services, death, law enforcement involvement — per MN 245D.06 and VAA).

This is decision support only; a human makes the final call.

Respond with ONLY a JSON object, no markdown:
{"severity": "minor"|"moderate"|"serious", "mandatoryReporting": <boolean>, "rationale": "<1-2 sentences citing what in the description drove this>", "deadlineNote": "<reporting deadline reminder if mandatoryReporting, else null>"}`

export function buildIncidentClassifyPrompt(input: IncidentClassifyInput): string {
  return [
    `Category selected by staff: ${input.category ?? 'not selected'}`,
    '',
    'Incident description:',
    input.description,
  ].join('\n')
}

const VALID_SEVERITIES: ReadonlySet<string> = new Set(['minor', 'moderate', 'serious'])

export function parseIncidentClassifyResponse(raw: string): IncidentClassifyResult | null {
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null
  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      severity?: unknown
      mandatoryReporting?: unknown
      rationale?: unknown
      deadlineNote?: unknown
    }
    const severityRaw = String(parsed.severity ?? '')
    return {
      severity: (VALID_SEVERITIES.has(severityRaw) ? severityRaw : 'review') as IncidentSeverity,
      mandatoryReporting: Boolean(parsed.mandatoryReporting),
      rationale: String(parsed.rationale ?? ''),
      deadlineNote: parsed.deadlineNote == null ? null : String(parsed.deadlineNote),
    }
  } catch {
    return null
  }
}
