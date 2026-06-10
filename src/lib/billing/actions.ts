'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/audit/log'

type ActionResult<T = null> = { data?: T; error: string | null }

const claimSchema = z.object({
  clientId: z.string().uuid(),
  payer: z.string().min(1, 'Payer is required'),
  authNumber: z.string().optional().or(z.literal('')),
  cptCode: z.string().min(1, 'CPT/HCPCS code is required'),
  modifier: z.string().optional().or(z.literal('')),
  rate: z.coerce.number().positive().optional(),
  amount: z.coerce.number().positive().optional(),
  serviceDate: z.string().min(1, 'Service date is required'),
  notes: z.string().optional().or(z.literal('')),
})

const updateClaimSchema = z.object({
  clientId: z.string().uuid(),
  payer: z.string().min(1, 'Payer is required'),
  authNumber: z.string().optional().or(z.literal('')),
  cptCode: z.string().min(1, 'CPT/HCPCS code is required'),
  modifier: z.string().optional().or(z.literal('')),
  rate: z.coerce.number().positive().optional(),
  amount: z.coerce.number().positive().optional(),
  serviceDate: z.string().min(1, 'Service date is required'),
  notes: z.string().optional().or(z.literal('')),
})

export async function createClaim(_prev: { error: string | null; success: boolean }, formData: FormData): Promise<{ error: string | null; success: boolean; claimId?: string }> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized', success: false }

  const parsed = claimSchema.safeParse({
    clientId: formData.get('clientId'),
    payer: formData.get('payer'),
    authNumber: formData.get('authNumber'),
    cptCode: formData.get('cptCode'),
    modifier: formData.get('modifier'),
    rate: formData.get('rate'),
    amount: formData.get('amount'),
    serviceDate: formData.get('serviceDate'),
    notes: formData.get('notes'),
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message, success: false }

  const supabase = await createClient()
  const claimNumber = `CLM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

  const { data, error } = await supabase.from('claims').insert({
    organization_id: user.organizationId,
    client_id: parsed.data.clientId,
    claim_number: claimNumber,
    payer: parsed.data.payer,
    auth_number: parsed.data.authNumber || null,
    cpt_code: parsed.data.cptCode,
    modifier: parsed.data.modifier || null,
    rate: parsed.data.rate || null,
    amount: parsed.data.amount || null,
    service_date: parsed.data.serviceDate,
    status: 'draft',
    notes: parsed.data.notes || null,
  }).select('id').single()

  if (error) return { error: error.message, success: false }

  revalidatePath('/billing-readiness/claims')
  return { error: null, success: true, claimId: data?.id }
}

export async function updateClaim(claimId: string, formData: FormData): Promise<{ error: string | null; success: boolean }> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized', success: false }

  const parsed = updateClaimSchema.safeParse({
    clientId: formData.get('clientId'),
    payer: formData.get('payer'),
    authNumber: formData.get('authNumber'),
    cptCode: formData.get('cptCode'),
    modifier: formData.get('modifier'),
    rate: formData.get('rate'),
    amount: formData.get('amount'),
    serviceDate: formData.get('serviceDate'),
    notes: formData.get('notes'),
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message, success: false }

  const supabase = await createClient()
  const { error } = await supabase.from('claims').update({
    client_id: parsed.data.clientId,
    payer: parsed.data.payer,
    auth_number: parsed.data.authNumber || null,
    cpt_code: parsed.data.cptCode,
    modifier: parsed.data.modifier || null,
    rate: parsed.data.rate || null,
    amount: parsed.data.amount || null,
    service_date: parsed.data.serviceDate,
    notes: parsed.data.notes || null,
    updated_at: new Date().toISOString(),
  }).eq('id', claimId).eq('organization_id', user.organizationId)

  if (error) return { error: error.message, success: false }

  revalidatePath('/billing-readiness/claims')
  return { error: null, success: true }
}

export async function submitClaim(claimId: string): Promise<ActionResult> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { data: claim } = await supabase
    .from('claims')
    .select('status')
    .eq('id', claimId)
    .eq('organization_id', user.organizationId)
    .single()

  if (!claim) return { error: 'Claim not found' }
  if (claim.status !== 'draft') return { error: 'Only draft claims can be submitted' }

  const { error } = await supabase.from('claims').update({
    status: 'submitted',
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', claimId).eq('organization_id', user.organizationId)

  if (error) return { error: error.message }

  await logAuditEvent({
    user,
    action: 'form_submitted',
    entityType: 'claim',
    entityId: claimId,
    entityLabel: `Claim submitted`,
  }).catch(() => null)

  revalidatePath('/billing-readiness/claims')
  return { error: null }
}

export async function payClaim(claimId: string): Promise<ActionResult> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { data: claim } = await supabase
    .from('claims')
    .select('status')
    .eq('id', claimId)
    .eq('organization_id', user.organizationId)
    .single()

  if (!claim) return { error: 'Claim not found' }
  if (claim.status !== 'submitted') return { error: 'Only submitted claims can be marked paid' }

  const { error } = await supabase.from('claims').update({
    status: 'paid',
    paid_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', claimId).eq('organization_id', user.organizationId)

  if (error) return { error: error.message }

  revalidatePath('/billing-readiness/claims')
  return { error: null }
}

export async function denyClaim(claimId: string, reason?: string): Promise<ActionResult> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { data: claim } = await supabase
    .from('claims')
    .select('status, notes')
    .eq('id', claimId)
    .eq('organization_id', user.organizationId)
    .single()

  if (!claim) return { error: 'Claim not found' }
  if (claim.status !== 'submitted') return { error: 'Only submitted claims can be denied' }

  const denialNote = reason ? `Denied: ${reason}` : 'Denied'
  const existingNotes = claim.notes ? `${claim.notes}\n` : ''

  const { error } = await supabase.from('claims').update({
    status: 'denied',
    notes: `${existingNotes}${denialNote}`,
    updated_at: new Date().toISOString(),
  }).eq('id', claimId).eq('organization_id', user.organizationId)

  if (error) return { error: error.message }

  revalidatePath('/billing-readiness/claims')
  return { error: null }
}

export async function getClaim(claimId: string): Promise<ActionResult<Record<string, unknown>>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('claims')
    .select('*, clients(legal_name, date_of_birth, gender, address, city, state, zip, phone, medicaid_number)')
    .eq('id', claimId)
    .eq('organization_id', user.organizationId)
    .single()

  if (error || !data) return { error: error?.message ?? 'Claim not found' }
  return { data: data as unknown as Record<string, unknown>, error: null }
}

export async function updateClaimStatus(claimId: string, status: string): Promise<ActionResult> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const update: Record<string, string | null> = { status, updated_at: new Date().toISOString() }
  if (status === 'submitted') update.submitted_at = new Date().toISOString()
  if (status === 'paid') update.paid_at = new Date().toISOString()

  const { error } = await supabase.from('claims').update(update).eq('id', claimId).eq('organization_id', user.organizationId)
  if (error) return { error: error.message }

  revalidatePath('/billing-readiness/claims')
  return { error: null }
}
