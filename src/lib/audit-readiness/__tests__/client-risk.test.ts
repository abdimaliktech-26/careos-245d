import { describe, test, expect } from 'vitest'
import {
  evaluateClientGaps,
  toClientRisk,
  type PacketLite,
  type ServicePlanLite,
} from '../client-risk'

const NOW = new Date('2026-06-22T12:00:00Z')

function packet(overrides: Partial<PacketLite>): PacketLite {
  return { packet_type: 'intake', status: 'completed', due_date: '2026-01-01', hasRequiredSignatures: true, ...overrides }
}

const COMPLETE_PLAN: ServicePlanLite = { status: 'active', review_date: '2027-01-01', annual_review_date: '2027-01-01' }

describe('evaluateClientGaps', () => {
  test('fully compliant client has no gaps', () => {
    const packets: PacketLite[] = [
      packet({ packet_type: 'intake' }),
      packet({ packet_type: 'annual_review' }),
      packet({ packet_type: 'semi_annual_review' }),
      packet({ packet_type: '45_day_review' }),
    ]
    const gaps = evaluateClientGaps(packets, COMPLETE_PLAN, NOW)
    expect(gaps).toEqual([])
  })

  test('flags every missing required packet type', () => {
    const gaps = evaluateClientGaps([], COMPLETE_PLAN, NOW)
    const codes = gaps.map((g) => g.code)
    expect(codes).toContain('missing_intake')
    expect(codes).toContain('missing_annual_review')
    expect(codes).toContain('missing_semi_annual_review')
    expect(codes).toContain('missing_45_day_review')
  })

  test('flags overdue required packets as missing-overdue', () => {
    const packets: PacketLite[] = [
      packet({ packet_type: 'intake' }),
      packet({ packet_type: 'annual_review' }),
      packet({ packet_type: 'semi_annual_review' }),
      packet({ packet_type: '45_day_review', status: 'in_progress', due_date: '2026-01-01' }),
    ]
    const gaps = evaluateClientGaps(packets, COMPLETE_PLAN, NOW)
    expect(gaps.map((g) => g.code)).toContain('missing_45_day_review')
  })

  test('flags unsigned completed packets', () => {
    const packets: PacketLite[] = [
      packet({ packet_type: 'intake', hasRequiredSignatures: false }),
      packet({ packet_type: 'annual_review' }),
      packet({ packet_type: 'semi_annual_review' }),
      packet({ packet_type: '45_day_review' }),
    ]
    const gaps = evaluateClientGaps(packets, COMPLETE_PLAN, NOW)
    expect(gaps.map((g) => g.code)).toContain('missing_signatures')
  })

  test('flags absent support plan as high risk', () => {
    const packets: PacketLite[] = [
      packet({ packet_type: 'intake' }),
      packet({ packet_type: 'annual_review' }),
      packet({ packet_type: 'semi_annual_review' }),
      packet({ packet_type: '45_day_review' }),
    ]
    const gaps = evaluateClientGaps(packets, null, NOW)
    const supportGap = gaps.find((g) => g.code === 'missing_support_plan')
    expect(supportGap?.risk).toBe('high')
  })

  test('flags draft service agreement and expired plan review', () => {
    const expiredPlan: ServicePlanLite = { status: 'draft', review_date: '2025-01-01', annual_review_date: '2025-01-01' }
    const packets: PacketLite[] = [
      packet({ packet_type: 'intake' }),
      packet({ packet_type: 'annual_review' }),
      packet({ packet_type: 'semi_annual_review' }),
      packet({ packet_type: '45_day_review' }),
    ]
    const codes = evaluateClientGaps(packets, expiredPlan, NOW).map((g) => g.code)
    expect(codes).toContain('incomplete_service_agreement')
    expect(codes).toContain('expired_assessment')
  })
})

describe('toClientRisk', () => {
  test('derives score and risk level from gaps', () => {
    const risk = toClientRisk(
      { clientId: 'c1', clientName: 'Jane', program: 'ICS', status: 'active' },
      [{ code: 'missing_intake', label: 'x', risk: 'high' }],
    )
    expect(risk.score).toBe(88)
    expect(risk.riskLevel).toBe('low')
  })
})
