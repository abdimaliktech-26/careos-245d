'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { revalidatePath } from 'next/cache'
import { getSubscriptionState } from '@/lib/organization/subscription'
import { logAuditEvent } from '@/lib/audit/log'

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['staff', 'program_manager', 'org_admin'], { message: 'Role must be a valid organization role' }),
})

type ActionResult = { error: string | null }

export async function inviteTeamMember(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !['org_admin', 'super_admin'].includes(user.role)) {
    return { error: 'Unauthorized' }
  }

  const targetOrgId =
    user.organizationId ??
    (formData.get('organizationId') as string | null)

  if (!targetOrgId) {
    return { error: 'No organization assigned' }
  }

  const adminClient = createAdminClient()
  const { data: organization, error: organizationError } = await adminClient
    .from('organizations')
    .select('plan, plan_expires_at')
    .eq('id', targetOrgId)
    .single()

  if (organizationError || !organization) {
    return { error: organizationError?.message ?? 'Organization not found' }
  }

  const subscription = getSubscriptionState(organization)
  if (!subscription.isActive) {
    return { error: 'Subscription expired. Update billing before inviting team members.' }
  }

  const { error: insertError } = await adminClient
    .from('invites')
    .insert({
      organization_id: targetOrgId,
      invited_by: user.id,
      email: parsed.data.email,
      role: parsed.data.role,
    })

  if (insertError) {
    return { error: insertError.message }
  }

  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: {
        role: parsed.data.role,
        organization_id: targetOrgId,
      },
    }
  )

  if (inviteError) {
    return { error: inviteError.message }
  }

  await logAuditEvent({
    user,
    action: 'invite_sent',
    entityType: 'invite',
    entityLabel: parsed.data.email,
    details: { role: parsed.data.role },
    organizationId: targetOrgId,
  }).catch(() => null)

  revalidatePath('/admin/team')
  return { error: null }
}
