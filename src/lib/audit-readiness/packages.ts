/**
 * Audit Readiness service packages (revenue tiers). Presentation + feature
 * gating only — gating reuses the organization's existing `plan` field and is
 * intentionally non-destructive: an unrecognized plan keeps full access.
 */

export type AuditTier = 'bronze' | 'silver' | 'gold'

export type AuditFeature =
  | 'snapshot'              // compliance score + missing document report
  | 'corrective_action_plan'
  | 'audit_report'
  | 'monitoring'           // continuous monitoring + monthly reviews
  | 'copilot'

export interface AuditPackage {
  tier: AuditTier
  name: string
  tagline: string
  features: string[]
}

export const AUDIT_PACKAGES: ReadonlyArray<AuditPackage> = [
  {
    tier: 'bronze',
    name: 'Audit Snapshot',
    tagline: 'A fast read on where you stand.',
    features: ['Compliance score', 'Missing document report'],
  },
  {
    tier: 'silver',
    name: 'Audit Readiness Review',
    tagline: 'A full review with a remediation plan.',
    features: ['Full compliance analysis', 'Corrective action plan', 'Audit report (PDF/Word/Excel)'],
  },
  {
    tier: 'gold',
    name: 'Compliance Monitoring',
    tagline: 'Always audit-ready, all year.',
    features: ['Continuous monitoring', 'Automated alerts', 'Monthly audit reviews', 'Executive reports', 'Audit Copilot'],
  },
]

const TIER_RANK: Record<AuditTier, number> = { bronze: 1, silver: 2, gold: 3 }

const FEATURE_TIER: Record<AuditFeature, AuditTier> = {
  snapshot: 'bronze',
  corrective_action_plan: 'silver',
  audit_report: 'silver',
  monitoring: 'gold',
  copilot: 'gold',
}

/**
 * Map an organization's stored plan to an audit tier. Recognizes explicit
 * bronze/silver/gold plans; any other value (including null) defaults to gold
 * so existing customers are never downgraded by the gating layer.
 */
export function auditTierFromPlan(plan: string | null | undefined): AuditTier {
  const p = (plan ?? '').toLowerCase()
  if (p.includes('bronze')) return 'bronze'
  if (p.includes('silver')) return 'silver'
  if (p.includes('gold')) return 'gold'
  return 'gold'
}

/** True when `current` tier meets or exceeds the tier required for `feature`. */
export function tierAllows(current: AuditTier, feature: AuditFeature): boolean {
  return TIER_RANK[current] >= TIER_RANK[FEATURE_TIER[feature]]
}

export function requiredTier(feature: AuditFeature): AuditTier {
  return FEATURE_TIER[feature]
}
