'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession } from '@/lib/auth/get-session'
import { logAuditEvent } from '@/lib/audit/log'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enqueueVisitTransmission } from './queue'

type ActionState = { error: string | null; success?: string | null }

const ADMIN_ROLES = ['org_admin', 'super_admin']

const configSchema = z.object({
  vendor: z.enum(['none', 'hhaexchange', 'sandata']),
  providerId: z.string().max(120).optional().or(z.literal('')),
  apiBase: z.string().url('API base must be a valid URL.').max(300).optional().or(z.literal('')),
  // Only an env-var NAME — never the secret value itself.
  credentialRef: z.string().regex(/^[A-Z0-9_]*$/, 'Use the UPPER_SNAKE_CASE name of the secret env var.').max(120).optional().or(z.literal('')),
  enabled: z.boolean(),
})

export async function saveAggregatorConfig(input: {
  vendor: 'none' | 'hhaexchange' | 'sandata'
  providerId?: string
  apiBase?: string
  credentialRef?: string
  enabled: boolean
}): Promise<ActionState> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }
  if (!ADMIN_ROLES.includes(user.role)) return { error: 'Org admin role required.' }

  const parsed = configSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Can't enable without the pieces needed to actually transmit.
  if (parsed.data.enabled && parsed.data.vendor !== 'none') {
    if (!parsed.data.providerId || !parsed.data.apiBase || !parsed.data.credentialRef) {
      return { error: 'Provider ID, API base, and credential reference are required to enable transmission.' }
    }
  }

  // Authorization enforced above; write with the service role so it works for
  // any admin actor (including super_admin acting cross-org).
  const admin = createAdminClient()
  const { error } = await admin.from('evv_aggregator_config').upsert(
    {
      organization_id: user.organizationId,
      vendor: parsed.data.vendor,
      provider_id: parsed.data.providerId || null,
      api_base: parsed.data.apiBase || null,
      credential_ref: parsed.data.credentialRef || null,
      enabled: parsed.data.enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id' }
  )
  if (error) return { error: error.message }

  await logAuditEvent({
    user,
    action: 'member_role_changed',
    entityType: 'evv_aggregator_config',
    entityLabel: `EVV aggregator set to ${parsed.data.vendor}`,
    details: { vendor: parsed.data.vendor, enabled: parsed.data.enabled },
  }).catch(() => null)

  revalidatePath('/evv')
  return { error: null, success: 'Aggregator configuration saved.' }
}

/** Re-queues a rejected/failed transmission after a human corrected the visit. */
export async function requeueTransmission(visitId: string): Promise<ActionState> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }
  if (!ADMIN_ROLES.includes(user.role) && user.role !== 'program_manager') {
    return { error: 'Supervisor role required.' }
  }
  if (!z.string().uuid().safeParse(visitId).success) return { error: 'Invalid visit.' }

  // System-managed table (RLS read-only for tenants) → write via service role.
  const admin = createAdminClient()
  const { error } = await admin
    .from('evv_aggregator_transmissions')
    .update({ status: 'queued', next_attempt_at: new Date().toISOString(), last_error: null })
    .eq('visit_id', visitId)
    .eq('organization_id', user.organizationId)
    .in('status', ['rejected', 'failed'])
  if (error) return { error: error.message }

  await logAuditEvent({
    user,
    action: 'packet_updated',
    entityType: 'evv_transmission',
    entityId: visitId,
    entityLabel: 'Aggregator transmission re-queued',
  }).catch(() => null)

  revalidatePath('/evv')
  return { error: null, success: 'Transmission re-queued.' }
}

/** Thin wrapper so callers outside the worker can enqueue on demand. */
export async function enqueueVisit(visitId: string): Promise<ActionState> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }
  if (!['program_manager', ...ADMIN_ROLES].includes(user.role)) return { error: 'Supervisor role required.' }
  if (!z.string().uuid().safeParse(visitId).success) return { error: 'Invalid visit.' }

  const supabase = await createClient()
  const { queued } = await enqueueVisitTransmission(user.organizationId, visitId, supabase)
  revalidatePath('/evv')
  return queued ? { error: null, success: 'Visit queued for the state aggregator.' } : { error: 'Could not queue visit.' }
}
