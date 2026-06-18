import { describe, test, expect } from 'vitest'
import { recommendProgram } from '../program-router'

describe('recommendProgram', () => {
  test('DD waiver with day-service need -> Day Services, high confidence', () => {
    const rec = recommendProgram({ waiver_type: 'DD', requested_service: 'day services', current_program: null })
    expect(rec?.program).toBe('Day Services')
    expect(rec!.confidence).toBeGreaterThanOrEqual(0.8)
  })

  test('CADI waiver -> ICS by default', () => {
    const rec = recommendProgram({ waiver_type: 'CADI', requested_service: null, current_program: null })
    expect(rec?.program).toBe('ICS')
  })

  test('unknown waiver -> low confidence recommendation', () => {
    const rec = recommendProgram({ waiver_type: 'XYZ', requested_service: null, current_program: null })
    expect(rec).not.toBeNull()
    expect(rec!.confidence).toBeLessThan(0.5)
  })
})
