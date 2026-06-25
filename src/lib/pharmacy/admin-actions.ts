'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { logMedicationEvent } from '@/lib/medications/audit'

type ActionResult<T = null> = { data: T; error: null } | { data: null; error: string }
const ADMIN_ROLES = ['org_admin', 'super_admin']

/** Create a pharmacy record and link it (approved) to the caller's org. */
export async function createPharmacyAndLink(input: {
  name: string
  email?: string
  phone?: string
  contactName?: string
}): Promise<ActionResult<{ pharmacyId: string }>> {
  const { user, error } = await getSession()
  if (error || !user?.organizationId || !ADMIN_ROLES.includes(user.role)) return { data: null, error: 'Unauthorized' }
  if (!input.name?.trim()) return { data: null, error: 'Pharmacy name is required.' }

  const supabase = await createServerClient()
  const { data: pharmacy, error: pErr } = await supabase
    .from('pharmacies')
    .insert({ name: input.name.trim(), email: input.email ?? null, phone: input.phone ?? null, contact_name: input.contactName ?? null, created_by: user.id, updated_by: user.id })
    .select('id')
    .single()
  if (pErr || !pharmacy) return { data: null, error: pErr?.message ?? 'Could not create pharmacy.' }

  const { error: lErr } = await supabase.from('provider_pharmacy_links').insert({
    organization_id: user.organizationId,
    pharmacy_id: pharmacy.id,
    status: 'approved',
    invited_email: input.email ?? null,
    invited_by: user.id,
    approved_by: user.id,
    approved_at: new Date().toISOString(),
    created_by: user.id,
  })
  if (lErr) return { data: null, error: lErr.message }

  await logMedicationEvent({
    user, organizationId: user.organizationId, action: 'pharmacy_invited',
    entityType: 'pharmacy', entityId: pharmacy.id, newValue: { name: input.name },
  })
  revalidatePath('/admin/pharmacies')
  return { data: { pharmacyId: pharmacy.id }, error: null }
}

/** Approve, reject, or suspend a pharmacy link to the caller's org. */
export async function setPharmacyLinkStatus(
  linkId: string,
  status: 'approved' | 'rejected' | 'suspended'
): Promise<ActionResult> {
  const { user, error } = await getSession()
  if (error || !user?.organizationId || !ADMIN_ROLES.includes(user.role)) return { data: null, error: 'Unauthorized' }
  const supabase = await createServerClient()
  const patch: Record<string, unknown> = { status, updated_by: user.id }
  if (status === 'approved') { patch.approved_by = user.id; patch.approved_at = new Date().toISOString() }
  const { error: uErr } = await supabase.from('provider_pharmacy_links').update(patch).eq('id', linkId)
  if (uErr) return { data: null, error: uErr.message }
  await logMedicationEvent({ user, organizationId: user.organizationId, action: 'pharmacy_access_changed', entityType: 'pharmacy_link', entityId: linkId, newValue: { status } })
  revalidatePath('/admin/pharmacies')
  return { data: null, error: null }
}

/** Assign a pharmacy to a client (org admin). */
export async function assignPharmacyToClient(input: {
  clientId: string
  pharmacyId: string
  isPrimary?: boolean
}): Promise<ActionResult> {
  const { user, error } = await getSession()
  if (error || !user?.organizationId || !ADMIN_ROLES.includes(user.role)) return { data: null, error: 'Unauthorized' }
  const supabase = await createServerClient()
  const { error: uErr } = await supabase.from('client_pharmacy_assignments').upsert(
    {
      organization_id: user.organizationId,
      client_id: input.clientId,
      pharmacy_id: input.pharmacyId,
      is_primary: input.isPrimary ?? false,
      assigned_by: user.id,
    },
    { onConflict: 'client_id,pharmacy_id' }
  )
  if (uErr) return { data: null, error: uErr.message }
  revalidatePath('/admin/pharmacies')
  return { data: null, error: null }
}

/**
 * Create a pharmacy login (auth user + pharmacy_users row). Uses the admin
 * client to provision the auth user with a temporary password.
 */
export async function createPharmacyUser(input: {
  pharmacyId: string
  email: string
  fullName: string
  role: 'pharmacy_admin' | 'pharmacy_staff'
  password: string
}): Promise<ActionResult<{ userId: string }>> {
  const { user, error } = await getSession()
  if (error || !user || !ADMIN_ROLES.includes(user.role)) return { data: null, error: 'Unauthorized' }
  if (!input.email || !input.password) return { data: null, error: 'Email and password are required.' }

  const admin = createAdminClient()
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  })
  if (cErr || !created.user) return { data: null, error: cErr?.message ?? 'Could not create user.' }

  const { error: puErr } = await admin.from('pharmacy_users').insert({
    pharmacy_id: input.pharmacyId,
    user_id: created.user.id,
    role: input.role,
    full_name: input.fullName,
    email: input.email,
    is_active: true,
  })
  if (puErr) return { data: null, error: puErr.message }
  revalidatePath('/admin/pharmacies')
  return { data: { userId: created.user.id }, error: null }
}
