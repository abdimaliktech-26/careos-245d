import type { createClient } from '@/lib/supabase/server'
import type { createAdminClient } from '@/lib/supabase/admin'
import type { AggregatorVendor, ResolvedAggregatorConfig } from './types'

type SupabaseReader = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>

/**
 * Loads an org's aggregator config and resolves the API key from the secret
 * store at runtime. The DB only stores the *name* of the secret
 * (`credential_ref`); the secret itself never touches the database.
 */
export async function getAggregatorConfig(
  organizationId: string,
  supabase: SupabaseReader
): Promise<ResolvedAggregatorConfig | null> {
  const { data, error } = await supabase
    .from('evv_aggregator_config')
    .select('vendor, provider_id, api_base, credential_ref, enabled')
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (error || !data) return null

  const row = data as {
    vendor: AggregatorVendor
    provider_id: string | null
    api_base: string | null
    credential_ref: string | null
    enabled: boolean
  }

  return {
    vendor: row.vendor,
    providerId: row.provider_id ?? '',
    apiBase: row.api_base ?? '',
    apiKey: resolveCredential(row.credential_ref),
    enabled: row.enabled,
  }
}

/** Resolves a secret by the env var name stored in `credential_ref`. */
function resolveCredential(credentialRef: string | null): string | null {
  if (!credentialRef) return null
  // Only allow plain env-var names — never interpret arbitrary values.
  if (!/^[A-Z0-9_]+$/.test(credentialRef)) return null
  return process.env[credentialRef] ?? null
}
