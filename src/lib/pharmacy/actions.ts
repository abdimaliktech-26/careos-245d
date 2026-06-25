'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { logMedicationEvent } from '@/lib/medications/audit'
import type { RefillStatus, MedicationOrderStatus } from '@/types/app'

type ActionResult<T = null> = { data: T; error: null } | { data: null; error: string }
const PROVIDER_ROLES = ['staff', 'program_manager', 'org_admin', 'super_admin']
const PHARMACY_ROLES = ['pharmacy_admin', 'pharmacy_staff']

/** Pharmacy responds to a refill request (status + note). */
export async function respondToRefill(
  refillId: string,
  status: RefillStatus,
  response?: string
): Promise<ActionResult> {
  const { user, error } = await getSession()
  if (error || !user) return { data: null, error: 'Unauthorized' }
  if (![...PHARMACY_ROLES, ...PROVIDER_ROLES].includes(user.role)) return { data: null, error: 'Unauthorized' }

  const supabase = await createServerClient()
  const { error: updErr } = await supabase
    .from('refill_requests')
    .update({ status, pharmacy_response: response ?? null, responded_by: user.id, responded_at: new Date().toISOString() })
    .eq('id', refillId)
  if (updErr) return { data: null, error: updErr.message }

  revalidatePath('/pharmacy/refills')
  revalidatePath('/pharmacy/deliveries')
  revalidatePath('/refills')
  return { data: null, error: null }
}

export interface SubmitOrderInput {
  organizationId: string
  clientId: string
  pharmacyId: string
  medicationName: string
  dosage?: string
  route?: string
  frequency?: string
  administrationTimes?: string[]
  prescribingPhysician?: string
  isControlled?: boolean
  notes?: string
}

/** Pharmacy submits a new medication order to a provider for review. */
export async function submitMedicationOrder(input: SubmitOrderInput): Promise<ActionResult<{ id: string }>> {
  const { user, error } = await getSession()
  if (error || !user || !PHARMACY_ROLES.includes(user.role)) return { data: null, error: 'Unauthorized' }

  const supabase = await createServerClient()
  const { data, error: insErr } = await supabase
    .from('medication_orders')
    .insert({
      organization_id: input.organizationId,
      pharmacy_id: input.pharmacyId,
      client_id: input.clientId,
      status: 'submitted',
      submitted_by: user.id,
      submitted_at: new Date().toISOString(),
      notes: input.notes ?? null,
      payload: {
        name: input.medicationName,
        dosage: input.dosage,
        route: input.route,
        frequency: input.frequency,
        administration_times: input.administrationTimes ?? [],
        prescribing_physician: input.prescribingPhysician,
        is_controlled: input.isControlled ?? false,
      },
      created_by: user.id,
    })
    .select('id')
    .single()
  if (insErr || !data) return { data: null, error: insErr?.message ?? 'Could not submit order.' }

  await logMedicationEvent({
    user, organizationId: input.organizationId, action: 'medication_order_submitted',
    clientId: input.clientId, entityType: 'medication_order', entityId: data.id,
    newValue: { name: input.medicationName },
  })
  revalidatePath('/pharmacy/orders')
  return { data: { id: data.id }, error: null }
}

/**
 * Provider reviews a pharmacy medication order. On "approve" the order's payload
 * is converted into an active medication profile (+ schedules) and linked back.
 */
export async function reviewMedicationOrder(
  orderId: string,
  decision: 'approve' | 'reject' | 'clarify',
  note?: string
): Promise<ActionResult> {
  const { user, error } = await getSession()
  if (error || !user?.organizationId || !PROVIDER_ROLES.includes(user.role)) return { data: null, error: 'Unauthorized' }

  const supabase = await createServerClient()
  const { data: order, error: getErr } = await supabase
    .from('medication_orders')
    .select('id, organization_id, client_id, pharmacy_id, payload, status')
    .eq('id', orderId)
    .maybeSingle()
  if (getErr || !order) return { data: null, error: 'Order not found.' }

  if (decision === 'reject') {
    await supabase.from('medication_orders').update({ status: 'rejected' as MedicationOrderStatus, reviewed_by: user.id, reviewed_at: new Date().toISOString(), clarification_note: note ?? null }).eq('id', orderId)
  } else if (decision === 'clarify') {
    await supabase.from('medication_orders').update({ status: 'needs_clarification' as MedicationOrderStatus, reviewed_by: user.id, reviewed_at: new Date().toISOString(), clarification_note: note ?? null }).eq('id', orderId)
  } else {
    const p = (order.payload ?? {}) as Record<string, unknown>
    const times = (p.administration_times as string[]) ?? []
    const { data: med } = await supabase
      .from('medications')
      .insert({
        organization_id: order.organization_id,
        client_id: order.client_id,
        name: (p.name as string) ?? 'Medication',
        dosage: (p.dosage as string) ?? null,
        route: (p.route as string) ?? null,
        frequency: (p.frequency as string) ?? null,
        administration_times: times,
        prescribing_physician: (p.prescribing_physician as string) ?? null,
        pharmacy_id: order.pharmacy_id,
        is_controlled: Boolean(p.is_controlled),
        status: 'active',
        created_by: user.id,
        updated_by: user.id,
      })
      .select('id')
      .single()

    if (med && times.length > 0) {
      await supabase.from('medication_schedules').insert(
        times.map((t) => ({ organization_id: order.organization_id, client_id: order.client_id, medication_id: med.id, time_of_day: t, is_prn: false, active: true }))
      )
    }
    await supabase.from('medication_orders').update({ status: 'approved' as MedicationOrderStatus, reviewed_by: user.id, reviewed_at: new Date().toISOString(), medication_id: med?.id ?? null }).eq('id', orderId)
  }

  await logMedicationEvent({
    user, organizationId: order.organization_id, action: 'medication_order_reviewed',
    clientId: order.client_id, entityType: 'medication_order', entityId: orderId,
    newValue: { decision, note: note ?? null },
  })
  revalidatePath('/pharmacy-orders')
  return { data: null, error: null }
}

/** Send a secure pharmacy<->provider message tied to optional context. */
export async function sendPharmacyMessage(input: {
  organizationId: string
  pharmacyId?: string | null
  clientId?: string | null
  medicationId?: string | null
  refillRequestId?: string | null
  medicationOrderId?: string | null
  body: string
}): Promise<ActionResult> {
  const { user, error } = await getSession()
  if (error || !user) return { data: null, error: 'Unauthorized' }
  if (!input.body?.trim()) return { data: null, error: 'Message cannot be empty.' }

  const supabase = await createServerClient()
  const { error: insErr } = await supabase.from('pharmacy_messages').insert({
    organization_id: input.organizationId,
    pharmacy_id: input.pharmacyId ?? user.pharmacyId ?? null,
    client_id: input.clientId ?? null,
    medication_id: input.medicationId ?? null,
    refill_request_id: input.refillRequestId ?? null,
    medication_order_id: input.medicationOrderId ?? null,
    sender_id: user.id,
    sender_role: user.role,
    body: input.body.trim(),
  })
  if (insErr) return { data: null, error: insErr.message }
  revalidatePath('/pharmacy/messages')
  revalidatePath('/pharmacy-messages')
  return { data: null, error: null }
}
