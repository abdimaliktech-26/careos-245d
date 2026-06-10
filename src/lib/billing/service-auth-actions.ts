'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'

type ActionResult<T = null> = { data?: T; error: string | null }

const authSchema = z.object({
  clientId: z.string().uuid(),
  authNumber: z.string().min(1),
  payer: z.string().min(1),
  cptCode: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  authorizedUnits: z.coerce.number().int().positive(),
})

const updateAuthSchema = z.object({
  authNumber: z.string().min(1),
  payer: z.string().min(1),
  cptCode: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  authorizedUnits: z.coerce.number().int().positive(),
  usedUnits: z.coerce.number().int().min(0),
  status: z.enum(['active', 'expired', 'exhausted']),
})

export async function createServiceAuth(_prev: { error: string | null; success: boolean }, formData: FormData): Promise<{ error: string | null; success: boolean }> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized', success: false }

  const parsed = authSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message, success: false }

  const supabase = await createClient()
  const { error } = await supabase.from('service_authorizations').insert({
    organization_id: user.organizationId,
    client_id: parsed.data.clientId,
    auth_number: parsed.data.authNumber,
    payer: parsed.data.payer,
    cpt_code: parsed.data.cptCode,
    start_date: parsed.data.startDate,
    end_date: parsed.data.endDate,
    authorized_units: parsed.data.authorizedUnits,
    used_units: 0,
    status: 'active',
  })

  if (error) return { error: error.message, success: false }
  revalidatePath('/billing-readiness/authorizations')
  return { error: null, success: true }
}

export async function updateServiceAuth(authId: string, formData: FormData): Promise<{ error: string | null; success: boolean }> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized', success: false }

  const parsed = updateAuthSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message, success: false }

  const supabase = await createClient()
  const { error } = await supabase.from('service_authorizations').update({
    auth_number: parsed.data.authNumber,
    payer: parsed.data.payer,
    cpt_code: parsed.data.cptCode,
    start_date: parsed.data.startDate,
    end_date: parsed.data.endDate,
    authorized_units: parsed.data.authorizedUnits,
    used_units: parsed.data.usedUnits,
    status: parsed.data.status,
    updated_at: new Date().toISOString(),
  }).eq('id', authId).eq('organization_id', user.organizationId)

  if (error) return { error: error.message, success: false }
  revalidatePath('/billing-readiness/authorizations')
  return { error: null, success: true }
}

export async function getServiceAuth(authId: string): Promise<ActionResult<Record<string, unknown>>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('service_authorizations')
    .select('*, clients(legal_name)')
    .eq('id', authId)
    .eq('organization_id', user.organizationId)
    .single()

  if (error) return { error: error.message }
  return { data: data as unknown as Record<string, unknown>, error: null }
}

export { createServiceAuth as createServiceAuthAction }
