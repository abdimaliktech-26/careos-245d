import { createAdminClient } from '@/lib/supabase/admin'

export type OrgAiSettings = { aiEnabled: boolean; monthlyLimit: number; features: Record<string, boolean> }

const DEFAULTS: OrgAiSettings = {
  aiEnabled: true,
  monthlyLimit: Number(process.env.AI_MONTHLY_LIMIT_DEFAULT || 2000),
  features: {},
}

/** Effective AI settings for an org (defaults when no row). Admin client. */
export async function getOrgAiSettings(organizationId: string): Promise<OrgAiSettings> {
  const admin = createAdminClient()
  const { data } = await admin.from('org_ai_settings')
    .select('ai_enabled, monthly_limit, features').eq('organization_id', organizationId).maybeSingle()
  if (!data) return DEFAULTS
  return {
    aiEnabled: data.ai_enabled,
    monthlyLimit: data.monthly_limit ?? DEFAULTS.monthlyLimit,
    features: (data.features as Record<string, boolean>) ?? {},
  }
}

/** A feature is on unless explicitly set false (and the org has AI enabled). */
export function isFeatureEnabled(settings: OrgAiSettings, feature: string): boolean {
  return settings.aiEnabled && settings.features[feature] !== false
}
