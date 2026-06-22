/**
 * Deterministic compliance scoring for the Audit Readiness module.
 * AI is used only for narrative explanation/recommendations elsewhere — the
 * numbers here are reproducible and testable.
 */

export type ComplianceBand = 'green' | 'yellow' | 'red'
export type AuditRiskLevel = 'high' | 'moderate' | 'low'

/** Spec bands: Green 90–100, Yellow 75–89, Red < 75. */
export function complianceBand(score: number): ComplianceBand {
  if (score >= 90) return 'green'
  if (score >= 75) return 'yellow'
  return 'red'
}

export const BAND_LABELS: Record<ComplianceBand, string> = {
  green: 'Audit Ready',
  yellow: 'Needs Attention',
  red: 'High Risk',
}

/** Hex colors aligned with the design system status palette. */
export const BAND_COLORS: Record<ComplianceBand, string> = {
  green: '#10B981',
  yellow: '#F59E0B',
  red: '#EF4444',
}

/** Map a 0–100 score to a per-entity risk level (inverse of the score). */
export function riskFromScore(score: number): AuditRiskLevel {
  if (score >= 85) return 'low'
  if (score >= 60) return 'moderate'
  return 'high'
}

const DEFAULT_WEIGHTS = { high: 12, moderate: 6, low: 2 } as const

/**
 * Clamp a 0–100 score from a starting value minus weighted penalties per gap.
 * Keeps the same "100 minus penalties" shape used by the existing
 * `getClientScorecards` so scores feel consistent across the app.
 */
export function scoreFromGaps(
  gaps: ReadonlyArray<{ risk: AuditRiskLevel }>,
  weights: { high: number; moderate: number; low: number } = DEFAULT_WEIGHTS,
): number {
  const penalty = gaps.reduce((sum, g) => sum + weights[g.risk], 0)
  return Math.max(0, Math.min(100, 100 - penalty))
}

/**
 * Roll several weighted sub-scores into one overall 0–100 score.
 * Weights need not sum to 1 — they are normalized.
 */
export function weightedOverall(
  parts: ReadonlyArray<{ score: number; weight: number }>,
): number {
  const totalWeight = parts.reduce((sum, p) => sum + p.weight, 0)
  if (totalWeight <= 0) return 100
  const weighted = parts.reduce((sum, p) => sum + p.score * p.weight, 0)
  return Math.round(weighted / totalWeight)
}
