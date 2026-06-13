'use server'

import { randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { revalidatePath } from 'next/cache'
import { createStaffSchema, type CreateStaffInput } from './schemas'
import type { StaffSummary } from '@/types/clients'
import { getSubscriptionState } from '@/lib/organization/subscription'
import { logAuditEvent } from '@/lib/audit/log'

type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }

export async function createStaffAccount(
  input: CreateStaffInput
): Promise<ActionResult<{ id: string; email: string; temporaryPassword: string }>> {
  const parsed = createStaffSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0].message }
  }

  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !['org_admin', 'super_admin'].includes(user.role)) {
    return { data: null, error: 'Unauthorized' }
  }
  const targetOrganizationId = user.role === 'super_admin'
    ? parsed.data.organizationId
    : user.organizationId

  if (!targetOrganizationId) {
    return { data: null, error: 'Choose an organization before creating staff.' }
  }

  const adminClient = createAdminClient()
  const { data: organization, error: organizationError } = await adminClient
    .from('organizations')
    .select('plan, plan_expires_at')
    .eq('id', targetOrganizationId)
    .single()

  if (organizationError || !organization) {
    return { data: null, error: organizationError?.message ?? 'Organization not found' }
  }

  const subscription = getSubscriptionState(organization)
  if (!subscription.isActive) {
    return { data: null, error: 'Subscription expired. Update billing before adding staff accounts.' }
  }

  const fullName = `${parsed.data.firstName.trim()} ${parsed.data.lastName.trim()}`.trim()
  const temporaryPassword = `Staff-${randomBytes(9).toString('base64url')}!`

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: parsed.data.email,
    email_confirm: true,
    password: temporaryPassword,
    user_metadata: { role: 'staff', organization_id: targetOrganizationId },
  })

  if (authError || !authData.user) {
    return { data: null, error: authError?.message ?? 'Failed to create auth user' }
  }

  const { data: member, error: memberError } = await adminClient
    .from('organization_members')
    .insert({
      organization_id: targetOrganizationId,
      user_id: authData.user.id,
      role: 'staff',
      full_name: fullName,
      email: parsed.data.email,
    })
    .select('id')
    .single()

  if (memberError || !member) {
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return { data: null, error: memberError?.message ?? 'Failed to create member profile' }
  }

  await adminClient.from('staff_profiles').insert({
    organization_id: targetOrganizationId,
    user_id: authData.user.id,
    full_name: fullName,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    role: 'staff',
    is_active: true,
  })
  await logAuditEvent({
    user: { ...user, organizationId: targetOrganizationId },
    action: 'staff_record_created',
    entityType: 'organization_member',
    entityId: member.id,
    entityLabel: fullName,
    details: { email: parsed.data.email },
  }).catch(() => null)

  revalidatePath('/admin/staff')
  revalidatePath('/admin/team')
  return {
    data: {
      id: member.id,
      email: parsed.data.email,
      temporaryPassword,
    },
    error: null,
  }
}

export async function listStaff(): Promise<ActionResult<StaffSummary[]>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !['org_admin', 'super_admin'].includes(user.role)) {
    return { data: null, error: 'Unauthorized' }
  }

  const supabase = await createServerClient()
  const query = supabase
    .from('staff_profiles')
    .select('id, full_name, email, phone, is_active, created_at, caregiver_id')
    .order('full_name')

  if (user.organizationId) query.eq('organization_id', user.organizationId)

  const { data, error } = await query
  if (error) return { data: null, error: error.message }
  return { data: data as StaffSummary[], error: null }
}

export async function deactivateStaff(staffId: string): Promise<ActionResult<void>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !['org_admin', 'super_admin'].includes(user.role)) {
    return { data: null, error: 'Unauthorized' }
  }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('staff_profiles')
    .update({ is_active: false })
    .eq('id', staffId)
    .eq('role', 'staff')

  if (error) return { data: null, error: error.message }
  await logAuditEvent({
    user,
    action: 'staff_record_updated',
    entityType: 'staff_profile',
    entityId: staffId,
    details: { isActive: false },
  }).catch(() => null)
  revalidatePath('/admin/staff')
  revalidatePath('/admin/team')
  return { data: undefined, error: null }
}

/**
 * Sets the EVV aggregator caregiver identifier (UMPI / registry id) on a staff
 * profile. Required to transmit a staffed visit to the state aggregator.
 */
export async function updateStaffCaregiverId(
  staffId: string,
  caregiverId: string
): Promise<ActionResult<void>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !['org_admin', 'super_admin'].includes(user.role)) {
    return { data: null, error: 'Unauthorized' }
  }

  const trimmed = caregiverId.trim()
  if (trimmed.length > 80) return { data: null, error: 'Caregiver ID is too long.' }

  const supabase = await createServerClient()
  const update = supabase
    .from('staff_profiles')
    .update({ caregiver_id: trimmed || null })
    .eq('id', staffId)
  if (user.organizationId) update.eq('organization_id', user.organizationId)

  const { error } = await update
  if (error) return { data: null, error: error.message }

  await logAuditEvent({
    user,
    action: 'staff_record_updated',
    entityType: 'staff_profile',
    entityId: staffId,
    details: { caregiverIdSet: Boolean(trimmed) },
  }).catch(() => null)
  revalidatePath('/admin/staff')
  return { data: undefined, error: null }
}

export async function reactivateStaff(staffId: string): Promise<ActionResult<void>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !['org_admin', 'super_admin'].includes(user.role)) {
    return { data: null, error: 'Unauthorized' }
  }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('staff_profiles')
    .update({ is_active: true })
    .eq('id', staffId)
    .eq('role', 'staff')

  if (error) return { data: null, error: error.message }
  await logAuditEvent({
    user,
    action: 'staff_record_updated',
    entityType: 'staff_profile',
    entityId: staffId,
    details: { isActive: true },
  }).catch(() => null)
  revalidatePath('/admin/staff')
  revalidatePath('/admin/team')
  return { data: undefined, error: null }
}
