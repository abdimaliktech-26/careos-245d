import { createAdminClient } from '@/lib/supabase/admin'

export type ResolvedServiceCode = { procedureCode: string; aggregatorCode: string | null; unitMinutes: number }

/** Look up the procedure/aggregator code for a service name in an org's state catalog. */
export async function resolveServiceCode(
  organizationId: string, stateCode: string, serviceName: string,
): Promise<ResolvedServiceCode | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('evv_service_codes')
    .select('procedure_code, aggregator_code, unit_minutes')
    .eq('organization_id', organizationId)
    .eq('state_code', stateCode)
    .eq('service_name', serviceName)
    .eq('active', true)
    .maybeSingle()
  if (!data) return null
  return { procedureCode: data.procedure_code, aggregatorCode: data.aggregator_code, unitMinutes: data.unit_minutes }
}

/** The wire `serviceType` for a resolved code, preferring the aggregator override. */
export function serviceTypeFor(resolved: ResolvedServiceCode | null, fallback: string): string {
  return resolved?.aggregatorCode ?? resolved?.procedureCode ?? fallback
}
