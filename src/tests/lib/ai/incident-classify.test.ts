import { describe, expect, test } from 'vitest'
import { buildIncidentClassifyPrompt, parseIncidentClassifyResponse } from '@/lib/ai/incident-classify'

describe('buildIncidentClassifyPrompt', () => {
  test('includes description and category', () => {
    const prompt = buildIncidentClassifyPrompt({
      description: 'Client fell in bathroom, bruise on arm.',
      category: 'fall',
    })
    expect(prompt).toContain('Client fell in bathroom')
    expect(prompt).toContain('fall')
  })
})

describe('parseIncidentClassifyResponse', () => {
  test('parses valid response', () => {
    const result = parseIncidentClassifyResponse(
      '{"severity": "moderate", "mandatoryReporting": false, "rationale": "Minor injury, no emergency care.", "deadlineNote": null}'
    )
    expect(result).toEqual({
      severity: 'moderate',
      mandatoryReporting: false,
      rationale: 'Minor injury, no emergency care.',
      deadlineNote: null,
    })
  })

  test('normalizes unknown severity to review', () => {
    const result = parseIncidentClassifyResponse(
      '{"severity": "catastrophic", "mandatoryReporting": true, "rationale": "x", "deadlineNote": "24h"}'
    )
    expect(result?.severity).toBe('review')
    expect(result?.mandatoryReporting).toBe(true)
  })

  test('returns null for garbage', () => {
    expect(parseIncidentClassifyResponse('nope')).toBeNull()
  })
})
