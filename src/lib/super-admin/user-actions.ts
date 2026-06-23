'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { logAuditEvent } from '@/lib/audit/log'

type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }

type CreateUserInput = {
  firstName: string
  lastName: string
  email: string
  role: string
  organizationId: string
}

export async function createUser(
  input: CreateUserInput
): Promise<ActionResult<{ id: string; email: string; temporaryPassword: string }>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || user.role !== 'super_admin') {
    return { data: null, error: 'Unauthorized' }
  }

  const { firstName, lastName, email, role, organizationId } = input

  if (!firstName?.trim() || !lastName?.trim()) {
    return { data: null, error: 'First and last name are required' }
  }
  if (!email?.trim() || !email.includes('@')) {
    return { data: null, error: 'Valid email is required' }
  }
  if (!['org_admin', 'program_manager', 'staff'].includes(role)) {
    return { data: null, error: 'Role must be org_admin, program_manager, or staff' }
  }
  if (!organizationId) {
    return { data: null, error: 'Organization is required' }
  }

  const admin = createAdminClient()

  const { data: org } = await admin
    .from('organizations')
    .select('id')
    .eq('id', organizationId)
    .single()

  if (!org) {
    return { data: null, error: 'Organization not found' }
  }

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
  const temporaryPassword = `Care-${randomBytes(9).toString('base64url')}!`

  // NOTE: do not put `role` in user_metadata — a DB trigger on auth.users
  // rejects it ("Database error creating new user"). Role lives on
  // organization_members instead.
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: email.trim(),
    email_confirm: true,
    password: temporaryPassword,
    user_metadata: { organization_id: organizationId },
  })

  if (authError || !authData.user) {
    return { data: null, error: authError?.message ?? 'Failed to create user' }
  }

  const { data: member, error: memberError } = await admin
    .from('organization_members')
    .insert({
      organization_id: organizationId,
      user_id: authData.user.id,
      role,
      full_name: fullName,
      email: email.trim(),
      is_active: true,
      joined_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (memberError || !member) {
    await admin.auth.admin.deleteUser(authData.user.id)
    return { data: null, error: memberError?.message ?? 'Failed to create member record' }
  }

  if (role === 'staff') {
    await admin.from('staff_profiles').insert({
      organization_id: organizationId,
      user_id: authData.user.id,
      full_name: fullName,
      email: email.trim(),
      role: 'staff',
      is_active: true,
    })
  }

  await logAuditEvent({
    user,
    action: 'staff_record_created',
    entityType: 'organization_member',
    entityId: member.id,
    entityLabel: fullName,
    details: { email: email.trim(), role },
    organizationId,
  }).catch(() => null)

  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    const { data: orgData } = await admin
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()

    const orgName = orgData?.name ?? 'Your Organization'

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Higsi <welcome@higsi.app>',
          to: [email.trim()],
          subject: `Welcome to Higsi — ${orgName}`,
          html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
            <h2 style="color:#10B99A">Welcome to Higsi, ${fullName}!</h2>
            <p>You've been added to <strong>${orgName}</strong> as a <strong>${role.replace(/_/g, ' ')}</strong>.</p>
            <div style="background:#EEF2FF;border-radius:12px;padding:16px;margin:16px 0">
              <p><strong>Email:</strong> ${email.trim()}</p>
              <p><strong>Temporary Password:</strong> <code style="background:#fff;padding:4px 8px;border-radius:4px;font-size:14px">${temporaryPassword}</code></p>
            </div>
            <p>You'll be prompted to change your password on first login.</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/login" style="display:inline-block;background:linear-gradient(135deg,#10B99A,#0E9E86);color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:bold;margin-top:8px">Sign In</a>
            <p style="color:#64748B;font-size:12px;margin-top:24px">Higsi 245D Suite — Minnesota HCBS compliance platform</p>
          </div>`,
        }),
      })
    } catch {
      // email failure is non-fatal
    }
  }

  revalidatePath('/super-admin/users')
  return {
    data: { id: member.id, email: email.trim(), temporaryPassword },
    error: null,
  }
}

export async function updateUserRole(
  memberId: string,
  newRole: string
): Promise<ActionResult<void>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || user.role !== 'super_admin') {
    return { data: null, error: 'Unauthorized' }
  }

  if (!['org_admin', 'program_manager', 'staff'].includes(newRole)) {
    return { data: null, error: 'Invalid role' }
  }

  const admin = createAdminClient()

  const { data: member } = await admin
    .from('organization_members')
    .select('id, user_id, organization_id, role, full_name')
    .eq('id', memberId)
    .single()

  if (!member) {
    return { data: null, error: 'Member not found' }
  }

  const { error } = await admin
    .from('organization_members')
    .update({ role: newRole })
    .eq('id', memberId)

  if (error) {
    return { data: null, error: error.message }
  }

  await admin.auth.admin.updateUserById(member.user_id, {
    user_metadata: { role: newRole },
  })

  if (newRole === 'staff') {
    const { data: existing } = await admin
      .from('staff_profiles')
      .select('id')
      .eq('user_id', member.user_id)
      .maybeSingle()

    if (!existing) {
      await admin.from('staff_profiles').insert({
        organization_id: member.organization_id,
        user_id: member.user_id,
        full_name: member.full_name,
        email: '',
        role: 'staff',
        is_active: true,
      })
    }
  }

  await logAuditEvent({
    user,
    action: 'member_role_changed',
    entityType: 'organization_member',
    entityId: memberId,
    entityLabel: (member as Record<string, unknown>).full_name as string ?? '',
    details: { from: (member as Record<string, unknown>).role, to: newRole },
    organizationId: (member as Record<string, unknown>).organization_id as string,
  }).catch(() => null)

  revalidatePath('/super-admin/users')
  return { data: undefined, error: null }
}

export async function toggleUserActive(memberId: string): Promise<ActionResult<{ isActive: boolean }>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || user.role !== 'super_admin') {
    return { data: null, error: 'Unauthorized' }
  }

  const admin = createAdminClient()

  const { data: member } = await admin
    .from('organization_members')
    .select('id, user_id, organization_id, is_active, full_name')
    .eq('id', memberId)
    .single()

  if (!member) {
    return { data: null, error: 'Member not found' }
  }

  const newStatus = !member.is_active

  const { error } = await admin
    .from('organization_members')
    .update({ is_active: newStatus })
    .eq('id', memberId)

  if (error) {
    return { data: null, error: error.message }
  }

  await logAuditEvent({
    user,
    action: 'staff_record_updated',
    entityType: 'organization_member',
    entityId: memberId,
    entityLabel: (member as Record<string, unknown>).full_name as string ?? '',
    details: { isActive: newStatus },
    organizationId: (member as Record<string, unknown>).organization_id as string,
  }).catch(() => null)

  revalidatePath('/super-admin/users')
  return { data: { isActive: newStatus }, error: null }
}
