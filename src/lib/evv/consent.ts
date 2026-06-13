'use server'

import { getSession } from '@/lib/auth/get-session'
import { logAuditEvent } from '@/lib/audit/log'
import { createClient } from '@/lib/supabase/server'

/**
 * Records the caregiver's one-time consent to active-visit location sharing.
 * Stored on their organization_members row so it is auditable, not just a
 * client-side flag. Idempotent.
 */
export async function grantLocationConsent(): Promise<{ error: string | null }> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('organization_members')
    .update({ location_consent_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('organization_id', user.organizationId)
    .is('location_consent_at', null)

  if (error) return { error: error.message }

  await logAuditEvent({
    user,
    action: 'packet_updated',
    entityType: 'organization_member',
    entityLabel: 'Location tracking consent granted',
    details: { consentedAt: new Date().toISOString() },
  }).catch(() => null)

  return { error: null }
}
