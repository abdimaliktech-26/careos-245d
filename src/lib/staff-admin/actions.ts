'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { revalidatePath } from 'next/cache'
import { createStaffSchema, type CreateStaffInput } from './schemas'
import type { StaffSummary } from '@/types/clients'

type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }

export async function createStaffAccount(
  input: CreateStaffInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = createStaffSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0].message }
  }

  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || user.role !== 'admin') {
    return { data: null, error: 'Unauthorized' }
  }
  if (!user.tenantId) {
    return { data: null, error: 'No tenant assigned' }
  }

  const adminClient = createAdminClient()

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: parsed.data.email,
    email_confirm: true,
    password: crypto.randomUUID(),
    user_metadata: { role: 'staff', tenant_id: user.tenantId },
  })

  if (authError || !authData.user) {
    return { data: null, error: authError?.message ?? 'Failed to create auth user' }
  }

  const { data: profile, error: profileError } = await adminClient
    .from('users')
    .insert({
      id: authData.user.id,
      tenant_id: user.tenantId,
      role: 'staff',
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
    })
    .select('id')
    .single()

  if (profileError || !profile) {
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return { data: null, error: profileError?.message ?? 'Failed to create profile' }
  }

  revalidatePath('/admin/staff')
  return { data: { id: profile.id }, error: null }
}

export async function listStaff(): Promise<ActionResult<StaffSummary[]>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || user.role !== 'admin') {
    return { data: null, error: 'Unauthorized' }
  }

  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, phone, is_active, created_at')
    .eq('role', 'staff')
    .order('last_name')

  if (error) return { data: null, error: error.message }
  return { data: data as StaffSummary[], error: null }
}

export async function deactivateStaff(staffId: string): Promise<ActionResult<void>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || user.role !== 'admin') {
    return { data: null, error: 'Unauthorized' }
  }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('id', staffId)
    .eq('role', 'staff')

  if (error) return { data: null, error: error.message }
  revalidatePath('/admin/staff')
  return { data: undefined, error: null }
}

export async function reactivateStaff(staffId: string): Promise<ActionResult<void>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || user.role !== 'admin') {
    return { data: null, error: 'Unauthorized' }
  }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('users')
    .update({ is_active: true })
    .eq('id', staffId)
    .eq('role', 'staff')

  if (error) return { data: null, error: error.message }
  revalidatePath('/admin/staff')
  return { data: undefined, error: null }
}
