import type { ProgramRecommendation } from '../types'

export type RouterInput = {
  waiver_type: string | null
  requested_service: string | null
  current_program: string | null
}

/**
 * Deterministic first-pass routing. Confidence < 0.6 means "ambiguous" — the
 * async AI step may add a rationale, but routing is always human-confirmed.
 */
export function recommendProgram(input: RouterInput): ProgramRecommendation | null {
  const waiver = (input.waiver_type ?? '').toUpperCase()
  const service = (input.requested_service ?? '').toLowerCase()

  if (service.includes('day service')) {
    return { program: 'Day Services', confidence: 0.85, reason: 'Requested service indicates day services.' }
  }

  if (waiver === 'DD') {
    return { program: 'ICLS', confidence: 0.75, reason: 'DD waiver typically routes to ICLS.' }
  }
  if (waiver === 'CADI' || waiver === 'BI') {
    return { program: 'ICS', confidence: 0.75, reason: `${waiver} waiver typically routes to ICS.` }
  }

  return { program: 'ICS', confidence: 0.3, reason: 'No clear signal; defaulting to ICS for review.' }
}
