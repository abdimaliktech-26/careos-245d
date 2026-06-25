'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { logMedicationEvent } from './audit'
import { dueTimesForDate, isMedicationActiveOn } from './schedule'
import type { MedAdminStatus, MedicationStatus, RefillUrgency } from '@/types/app'

type ActionResult<T = null> = { data: T; error: null } | { data: null; error: string }

const PROVIDER_ROLES = ['staff', 'program_manager', 'org_admin', 'super_admin']

export interface MedicationInput {
  clientId: string
  name: string
  genericName?: string
  dosage?: string
  route?: string
  frequency?: string
  administrationTimes?: string[]
  startDate?: string | null
  endDate?: string | null
  prescribingPhysician?: string
  pharmacyId?: string | null
  isPrn?: boolean
  isControlled?: boolean
  specialInstructions?: string
}

/** Create a medication profile (+ schedules from administration times). */
export async function createMedication(input: MedicationInput): Promise<ActionResult<{ id: string }>> {
  const { user, error } = await getSession()
  if (error || !user?.organizationId || !PROVIDER_ROLES.includes(user.role)) {
    return { data: null, error: 'Unauthorized' }
  }
  if (!input.clientId || !input.name?.trim()) {
    return { data: null, error: 'Client and medication name are required.' }
  }

  const supabase = await createServerClient()
  const times = (input.administrationTimes ?? []).filter(Boolean)

  const { data: med, error: insertError } = await supabase
    .from('medications')
    .insert({
      organization_id: user.organizationId,
      client_id: input.clientId,
      name: input.name.trim(),
      generic_name: input.genericName ?? null,
      dosage: input.dosage ?? null,
      route: input.route ?? null,
      frequency: input.frequency ?? null,
      administration_times: times,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      prescribing_physician: input.prescribingPhysician ?? null,
      pharmacy_id: input.pharmacyId ?? null,
      is_prn: input.isPrn ?? false,
      is_controlled: input.isControlled ?? false,
      special_instructions: input.specialInstructions ?? null,
      status: 'active',
      created_by: user.id,
      updated_by: user.id,
    })
    .select('id')
    .single()

  if (insertError || !med) {
    return { data: null, error: insertError?.message ?? 'Could not create medication.' }
  }

  // Build a schedule row per administration time (non-PRN).
  if (!input.isPrn && times.length > 0) {
    await supabase.from('medication_schedules').insert(
      times.map((t) => ({
        organization_id: user.organizationId,
        client_id: input.clientId,
        medication_id: med.id,
        time_of_day: t,
        is_prn: false,
        active: true,
      }))
    )
  }

  await logMedicationEvent({
    user,
    organizationId: user.organizationId,
    action: 'medication_created',
    clientId: input.clientId,
    medicationId: med.id,
    entityType: 'medication',
    entityId: med.id,
    newValue: { name: input.name, dosage: input.dosage, status: 'active' },
  })

  revalidatePath(`/clients/${input.clientId}/medications`)
  revalidatePath('/medications')
  return { data: { id: med.id }, error: null }
}

/** Update mutable fields on a medication profile. */
export async function updateMedication(id: string, input: Partial<MedicationInput>): Promise<ActionResult> {
  const { user, error } = await getSession()
  if (error || !user?.organizationId || !PROVIDER_ROLES.includes(user.role)) {
    return { data: null, error: 'Unauthorized' }
  }
  const supabase = await createServerClient()

  const patch: Record<string, unknown> = { updated_by: user.id }
  if (input.name !== undefined) patch.name = input.name.trim()
  if (input.genericName !== undefined) patch.generic_name = input.genericName
  if (input.dosage !== undefined) patch.dosage = input.dosage
  if (input.route !== undefined) patch.route = input.route
  if (input.frequency !== undefined) patch.frequency = input.frequency
  if (input.administrationTimes !== undefined) patch.administration_times = input.administrationTimes
  if (input.startDate !== undefined) patch.start_date = input.startDate
  if (input.endDate !== undefined) patch.end_date = input.endDate
  if (input.prescribingPhysician !== undefined) patch.prescribing_physician = input.prescribingPhysician
  if (input.specialInstructions !== undefined) patch.special_instructions = input.specialInstructions
  if (input.isControlled !== undefined) patch.is_controlled = input.isControlled

  const { error: updateError } = await supabase.from('medications').update(patch).eq('id', id)
  if (updateError) return { data: null, error: updateError.message }

  await logMedicationEvent({
    user, organizationId: user.organizationId, action: 'medication_updated',
    medicationId: id, entityType: 'medication', entityId: id, newValue: patch,
  })
  revalidatePath('/medications')
  return { data: null, error: null }
}

/** Discontinue a medication and deactivate its schedules. */
export async function discontinueMedication(id: string): Promise<ActionResult> {
  const { user, error } = await getSession()
  if (error || !user?.organizationId || !PROVIDER_ROLES.includes(user.role)) {
    return { data: null, error: 'Unauthorized' }
  }
  const supabase = await createServerClient()
  const status: MedicationStatus = 'discontinued'
  const { error: updateError } = await supabase
    .from('medications')
    .update({ status, updated_by: user.id })
    .eq('id', id)
  if (updateError) return { data: null, error: updateError.message }

  await supabase.from('medication_schedules').update({ active: false }).eq('medication_id', id)
  await logMedicationEvent({
    user, organizationId: user.organizationId, action: 'medication_discontinued',
    medicationId: id, entityType: 'medication', entityId: id, newValue: { status },
  })
  revalidatePath('/medications')
  return { data: null, error: null }
}

export interface AdministrationInput {
  medicationId: string
  clientId: string
  taskId?: string | null
  status: MedAdminStatus
  signature: string
  notes?: string
  reason?: string
  prnReason?: string
  prnOutcome?: string
  painBefore?: number | null
  painAfter?: number | null
  scheduledFor?: string | null
}

/** Record a medication administration event and close out its pass task. */
export async function recordAdministration(input: AdministrationInput): Promise<ActionResult<{ id: string }>> {
  const { user, error } = await getSession()
  if (error || !user?.organizationId || !PROVIDER_ROLES.includes(user.role)) {
    return { data: null, error: 'Unauthorized' }
  }
  if (!input.signature?.trim()) {
    return { data: null, error: 'Electronic signature is required.' }
  }
  const needsReason = ['refused', 'held', 'missed'].includes(input.status)
  if (needsReason && !input.reason?.trim()) {
    return { data: null, error: 'A reason is required when a dose is refused, held, or missed.' }
  }

  const supabase = await createServerClient()

  // Resolve the staff_profiles.id for this user (signature trail).
  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: rec, error: insertError } = await supabase
    .from('medication_administration_records')
    .insert({
      organization_id: user.organizationId,
      client_id: input.clientId,
      medication_id: input.medicationId,
      task_id: input.taskId ?? null,
      status: input.status,
      scheduled_for: input.scheduledFor ?? null,
      staff_id: staff?.id ?? null,
      signature: input.signature.trim(),
      notes: input.notes ?? null,
      reason: input.reason ?? null,
      prn_reason: input.prnReason ?? null,
      prn_outcome: input.prnOutcome ?? null,
      pain_before: input.painBefore ?? null,
      pain_after: input.painAfter ?? null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (insertError || !rec) {
    return { data: null, error: insertError?.message ?? 'Could not record administration.' }
  }

  if (input.taskId) {
    await supabase
      .from('medication_pass_tasks')
      .update({ status: 'completed', record_id: rec.id })
      .eq('id', input.taskId)
  }

  await logMedicationEvent({
    user, organizationId: user.organizationId, action: 'medication_administered',
    clientId: input.clientId, medicationId: input.medicationId,
    entityType: 'mar', entityId: rec.id,
    newValue: { status: input.status, scheduled_for: input.scheduledFor ?? null },
  })

  revalidatePath('/medication-pass')
  revalidatePath(`/clients/${input.clientId}/mar`)
  return { data: { id: rec.id }, error: null }
}

/**
 * Idempotently generate medication-pass tasks for today from active, scheduled
 * medications. Safe to call on each medication-pass page load (unique index on
 * medication_id + due_at prevents duplicates).
 */
export async function ensureTodayTasks(): Promise<ActionResult<{ created: number }>> {
  const { user, error } = await getSession()
  if (error || !user?.organizationId || !PROVIDER_ROLES.includes(user.role)) {
    return { data: null, error: 'Unauthorized' }
  }
  const supabase = await createServerClient()
  const today = new Date()

  const { data: meds } = await supabase
    .from('medications')
    .select('id, client_id, administration_times, is_prn, start_date, end_date, status')
    .eq('organization_id', user.organizationId)
    .eq('status', 'active')

  if (!meds || meds.length === 0) return { data: { created: 0 }, error: null }

  const rows: Array<{ organization_id: string; client_id: string; medication_id: string; due_at: string }> = []
  for (const med of meds) {
    if (med.is_prn) continue
    if (!isMedicationActiveOn(today, med.start_date, med.end_date)) continue
    for (const due of dueTimesForDate(today, med.administration_times ?? [], false)) {
      rows.push({
        organization_id: user.organizationId,
        client_id: med.client_id,
        medication_id: med.id,
        due_at: due.toISOString(),
      })
    }
  }
  if (rows.length === 0) return { data: { created: 0 }, error: null }

  // upsert on the unique (medication_id, due_at) index — ignore duplicates.
  const { error: upsertError } = await supabase
    .from('medication_pass_tasks')
    .upsert(rows, { onConflict: 'medication_id,due_at', ignoreDuplicates: true })
  if (upsertError) return { data: null, error: upsertError.message }

  return { data: { created: rows.length }, error: null }
}

export interface RefillInput {
  clientId: string
  medicationId: string
  pharmacyId?: string | null
  quantityRemaining?: number | null
  daysRemaining?: number | null
  urgency?: RefillUrgency
  notes?: string
}

/** Staff/admin requests a refill from the client's pharmacy. */
export async function requestRefill(input: RefillInput): Promise<ActionResult<{ id: string }>> {
  const { user, error } = await getSession()
  if (error || !user?.organizationId || !PROVIDER_ROLES.includes(user.role)) {
    return { data: null, error: 'Unauthorized' }
  }
  const supabase = await createServerClient()
  const { data: refill, error: insertError } = await supabase
    .from('refill_requests')
    .insert({
      organization_id: user.organizationId,
      client_id: input.clientId,
      medication_id: input.medicationId,
      pharmacy_id: input.pharmacyId ?? null,
      quantity_remaining: input.quantityRemaining ?? null,
      days_remaining: input.daysRemaining ?? null,
      urgency: input.urgency ?? 'routine',
      notes: input.notes ?? null,
      status: 'requested',
      requested_by: user.id,
    })
    .select('id')
    .single()
  if (insertError || !refill) {
    return { data: null, error: insertError?.message ?? 'Could not request refill.' }
  }
  await logMedicationEvent({
    user, organizationId: user.organizationId, action: 'refill_requested',
    clientId: input.clientId, medicationId: input.medicationId,
    entityType: 'refill_request', entityId: refill.id, newValue: { urgency: input.urgency ?? 'routine' },
  })
  revalidatePath('/refills')
  return { data: { id: refill.id }, error: null }
}
