import { createClient } from '@/lib/supabase/server'
import { getStateProfile, DEFAULT_STATE } from './registry'
import type { StateProfile } from './types'

/** Pure: merge per-org overrides onto a base profile. */
export function applyOverrides(profile: StateProfile, overrides: Partial<StateProfile> | null): StateProfile {
  if (!overrides) return profile
  return { ...profile, ...overrides }
}

/** Resolve the org's effective state profile (RLS-scoped read). Falls back to MN. */
export async function getOrgStateProfile(organizationId: string): Promise<StateProfile> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('evv_state_config')
    .select('state_code, overrides')
    .eq('organization_id', organizationId)
    .maybeSingle()
  const base = getStateProfile(data?.state_code ?? DEFAULT_STATE) ?? getStateProfile(DEFAULT_STATE)!
  return applyOverrides(base, (data?.overrides as Partial<StateProfile>) ?? null)
}
