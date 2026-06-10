'use server'

import { randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { revalidatePath } from 'next/cache'

type OnboardingResult = { error: string | null; success: boolean }

export async function saveOrganizationSettings(
  prevState: OnboardingResult,
  formData: FormData
): Promise<OnboardingResult> {
  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Organization name is required', success: false }

  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) return { error: 'Unauthorized', success: false }
  if (!user.organizationId) return { error: 'No organization assigned', success: false }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('organizations')
    .update({
      name,
      license_number: (formData.get('licenseNumber') as string)?.trim() || null,
      phone: (formData.get('phone') as string)?.trim() || null,
    })
    .eq('id', user.organizationId)

  if (error) return { error: error.message, success: false }
  return { error: null, success: true }
}

export async function inviteTeamMembers(
  prevState: OnboardingResult,
  formData: FormData
): Promise<OnboardingResult> {
  const email = (formData.get('email') as string)?.trim()
  if (!email) return { error: null, success: true }

  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) return { error: 'Unauthorized', success: false }
  if (!user.organizationId) return { error: 'No organization assigned', success: false }

  const rawRole = (formData.get('role') as string) || 'staff'
  const name = (formData.get('name') as string)?.trim() || email

  const roleMap: Record<string, string> = {
    'program_manager': 'program_manager',
    'staff': 'staff',
    'Program Manager': 'program_manager',
    'Staff': 'staff',
  }
  const dbRole = roleMap[rawRole] || 'staff'

  const adminClient = createAdminClient()

  const { data: existingUsers } = await adminClient.auth.admin.listUsers()
  const existing = existingUsers?.users?.find((u) => u.email === email)

  let userId: string
  if (existing) {
    userId = existing.id
  } else {
    const temporaryPassword = `Onboard-${randomBytes(9).toString('base64url')}!`
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
      password: temporaryPassword,
      user_metadata: { role: dbRole, organization_id: user.organizationId },
    })
    if (authError || !authData.user) {
      return { error: authError?.message ?? 'Failed to create user account', success: false }
    }
    userId = authData.user.id
  }

  const { error: memberError } = await adminClient
    .from('organization_members')
    .insert({
      organization_id: user.organizationId,
      user_id: userId,
      role: dbRole,
      full_name: name,
      email,
      is_active: true,
    })

  if (memberError) return { error: memberError.message, success: false }

  return { error: null, success: true }
}

export async function createFirstClient(
  prevState: OnboardingResult,
  formData: FormData
): Promise<OnboardingResult> {
  const firstName = (formData.get('firstName') as string)?.trim()
  if (!firstName) return { error: null, success: true }

  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) return { error: 'Unauthorized', success: false }
  if (!user.organizationId) return { error: 'No organization assigned', success: false }

  const lastName = (formData.get('lastName') as string)?.trim() || ''
  const program = (formData.get('program') as string) || 'ICS'
  const today = new Date().toISOString().split('T')[0]
  const legalName = `${firstName} ${lastName}`.trim()

  const supabase = await createServerClient()
  const { error } = await supabase.from('clients').insert({
    organization_id: user.organizationId,
    assigned_staff_id: user.id,
    legal_name: legalName,
    program,
    intake_date: today,
    status: 'active',
  })

  if (error) return { error: error.message, success: false }

  revalidatePath('/clients')
  return { error: null, success: true }
}

export async function completeOnboarding(
  prevState: OnboardingResult,
  formData: FormData
): Promise<OnboardingResult> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) return { error: 'Unauthorized', success: false }
  if (!user.organizationId) return { error: 'No organization assigned', success: false }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('organizations')
    .update({ onboarding_completed: true })
    .eq('id', user.organizationId)

  if (error) return { error: error.message, success: false }

  revalidatePath('/onboarding')
  revalidatePath('/dashboard')
  return { error: null, success: true }
}
