'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { logAuditEvent } from '@/lib/audit/log'

const SESSION_MINUTES = 60

export async function enterOrg(orgId: string): Promise<{ error: string } | void> {
  const { user, error } = await getSession()
  if (error || !user || user.role !== 'super_admin') return { error: 'Unauthorized' }

  const admin = createAdminClient()
  const { data: org } = await admin.from('organizations').select('id').eq('id', orgId).maybeSingle()
  if (!org) return { error: 'Organization not found' }

  // End any existing active session, then open a fresh one.
  await admin.from('super_admin_impersonations').update({ ended_at: new Date().toISOString() })
    .eq('super_admin_id', user.id).is('ended_at', null)

  const expiresAt = new Date(Date.now() + SESSION_MINUTES * 60000).toISOString()
  const { error: insErr } = await admin.from('super_admin_impersonations').insert({
    super_admin_id: user.id, organization_id: orgId, expires_at: expiresAt,
  })
  if (insErr) return { error: insErr.message }

  await logAuditEvent({
    user, action: 'impersonation_started', entityType: 'organization', entityId: orgId,
    entityLabel: 'Entered org as admin', organizationId: orgId,
  }).catch(() => null)

  redirect('/dashboard')
}

export async function exitOrg(): Promise<{ error: string } | void> {
  const { user, error } = await getSession()
  if (error || !user || user.role !== 'super_admin') return { error: 'Unauthorized' }

  const admin = createAdminClient()
  await admin.from('super_admin_impersonations').update({ ended_at: new Date().toISOString() })
    .eq('super_admin_id', user.id).is('ended_at', null)

  await logAuditEvent({
    user, action: 'impersonation_ended', entityType: 'organization',
    entityId: user.impersonating?.orgId ?? undefined, entityLabel: 'Exited org admin view',
  }).catch(() => null)

  redirect('/super-admin/organizations')
}
