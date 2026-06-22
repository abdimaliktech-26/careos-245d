import { describe, test, expect } from 'vitest'
import {
  complianceBand,
  riskFromScore,
  scoreFromGaps,
  weightedOverall,
  type AuditRiskLevel,
} from '../score'

describe('complianceBand', () => {
  test('returns green at and above 90', () => {
    expect(complianceBand(90)).toBe('green')
    expect(complianceBand(100)).toBe('green')
  })

  test('returns yellow between 75 and 89', () => {
    expect(complianceBand(75)).toBe('yellow')
    expect(complianceBand(89)).toBe('yellow')
  })

  test('returns red below 75', () => {
    expect(complianceBand(74)).toBe('red')
    expect(complianceBand(0)).toBe('red')
  })
})

describe('riskFromScore', () => {
  test('high risk for low scores', () => {
    expect(riskFromScore(59)).toBe('high')
  })

  test('moderate risk in the middle band', () => {
    expect(riskFromScore(60)).toBe('moderate')
    expect(riskFromScore(84)).toBe('moderate')
  })

  test('low risk for high scores', () => {
    expect(riskFromScore(85)).toBe('low')
    expect(riskFromScore(100)).toBe('low')
  })
})

describe('scoreFromGaps', () => {
  test('returns 100 when there are no gaps', () => {
    expect(scoreFromGaps([])).toBe(100)
  })

  test('subtracts weighted penalties and clamps at 0', () => {
    const gaps: Array<{ risk: AuditRiskLevel }> = Array.from({ length: 10 }, () => ({ risk: 'high' }))
    expect(scoreFromGaps(gaps)).toBe(0)
  })

  test('applies per-risk weights', () => {
    // one high (12) + one moderate (6) + one low (2) = 20 penalty
    const gaps: Array<{ risk: AuditRiskLevel }> = [{ risk: 'high' }, { risk: 'moderate' }, { risk: 'low' }]
    expect(scoreFromGaps(gaps)).toBe(80)
  })
})

describe('weightedOverall', () => {
  test('returns 100 when there are no parts', () => {
    expect(weightedOverall([])).toBe(100)
  })

  test('normalizes weights that do not sum to one', () => {
    const result = weightedOverall([
      { score: 100, weight: 3 },
      { score: 0, weight: 1 },
    ])
    expect(result).toBe(75)
  })
})
