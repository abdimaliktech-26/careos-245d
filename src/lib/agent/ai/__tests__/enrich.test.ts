import { describe, test, expect } from 'vitest'
import { parseEnrichResponse } from '../enrich'

describe('parseEnrichResponse', () => {
  test('parses valid model JSON', () => {
    const out = parseEnrichResponse(JSON.stringify({
      summary: 'Date of birth is missing; confirm program ICS.',
      anomalies: [{ code: 'gps_far', message: 'GPS 400m from address.' }],
    }))
    expect(out.summary).toContain('Date of birth')
    expect(out.anomalies).toHaveLength(1)
  })

  test('throws when required anomalies field is absent', () => {
    expect(() => parseEnrichResponse(JSON.stringify({ summary: 'ok' }))).toThrow()
  })

  test('throws on non-JSON output (caller swallows)', () => {
    expect(() => parseEnrichResponse('not json')).toThrow()
  })

  test('throws when summary exceeds max length', () => {
    expect(() => parseEnrichResponse(JSON.stringify({ summary: 'x'.repeat(801), anomalies: [] }))).toThrow()
  })
})
