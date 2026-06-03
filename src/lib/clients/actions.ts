'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { revalidatePath } from 'next/cache'
import { addDays, addMonths } from 'date-fns'
import {
  createClientSchema,
  updateClientSchema,
  type CreateClientInput,
  type UpdateClientInput,
} from './schemas'
import type { ClientSummary, ClientDetail, FormSetStatus } from '@/types/clients'

type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }

export async function createClientRecord(
  input: CreateClientInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = createClientSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0].message }
  }

  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || user.role !== 'staff') {
    return { data: null, error: 'Unauthorized' }
  }
  if (!user.tenantId) {
    return { data: null, error: 'No tenant assigned' }
  }

  const supabase = await createServerClient()

  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      tenant_id: user.tenantId,
      assigned_staff_id: user.id,
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      date_of_birth: parsed.data.dateOfBirth || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      city: parsed.data.city || null,
      state: parsed.data.state,
      zip: parsed.data.zip || null,
      guardian_name: parsed.data.guardianName || null,
      guardian_phone: parsed.data.guardianPhone || null,
      guardian_email: parsed.data.guardianEmail || null,
      guardian_relationship: parsed.data.guardianRelationship || null,
      program_id: parsed.data.programId || null,
      intake_date: parsed.data.intakeDate,
    })
    .select('id')
    .single()

  if (error || !client) {
    return { data: null, error: error?.message ?? 'Failed to create client' }
  }

  await scheduleFormAssignments(supabase, client.id, user.tenantId, new Date(parsed.data.intakeDate))

  revalidatePath('/staff/clients')
  return { data: { id: client.id }, error: null }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function scheduleFormAssignments(supabase: any, clientId: string, tenantId: string, intakeDate: Date) {
  const { data: forms } = await supabase
    .from('form_definitions')
    .select('id, form_set')
    .eq('is_active', true)

  if (!forms?.length) return

  const dueDateBySet: Record<string, string> = {
    intake: intakeDate.toISOString().split('T')[0],
    '45day': addDays(intakeDate, 45).toISOString().split('T')[0],
    semiannual: addMonths(intakeDate, 6).toISOString().split('T')[0],
    annual: addMonths(intakeDate, 12).toISOString().split('T')[0],
  }

  const assignments = forms.map((form: { id: string; form_set: string }) => ({
    tenant_id: tenantId,
    client_id: clientId,
    form_definition_id: form.id,
    form_set: form.form_set,
    due_date: dueDateBySet[form.form_set],
    status: 'pending',
  }))

  await supabase.from('form_assignments').insert(assignments)
}

export async function getClients(): Promise<ActionResult<ClientSummary[]>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || user.role !== 'staff') {
    return { data: null, error: 'Unauthorized' }
  }

  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('clients')
    .select('id, first_name, last_name, intake_date, status, program_id, programs(name, code)')
    .eq('status', 'active')
    .order('last_name')

  if (error) return { data: null, error: error.message }
  return { data: data as unknown as ClientSummary[], error: null }
}

export async function getClientById(id: string): Promise<ActionResult<ClientDetail>> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*, programs(id, name, code)')
    .eq('id', id)
    .single()

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Client not found' }
  }
  return { data: data as ClientDetail, error: null }
}

export async function updateClientRecord(
  id: string,
  input: UpdateClientInput
): Promise<ActionResult<void>> {
  const parsed = updateClientSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0].message }
  }

  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || user.role !== 'staff') {
    return { data: null, error: 'Unauthorized' }
  }

  const supabase = await createServerClient()
  const updates: Record<string, unknown> = {}

  if (parsed.data.firstName !== undefined) updates.first_name = parsed.data.firstName
  if (parsed.data.lastName !== undefined) updates.last_name = parsed.data.lastName
  if (parsed.data.dateOfBirth !== undefined) updates.date_of_birth = parsed.data.dateOfBirth || null
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone || null
  if (parsed.data.email !== undefined) updates.email = parsed.data.email || null
  if (parsed.data.address !== undefined) updates.address = parsed.data.address || null
  if (parsed.data.city !== undefined) updates.city = parsed.data.city || null
  if (parsed.data.state !== undefined) updates.state = parsed.data.state
  if (parsed.data.zip !== undefined) updates.zip = parsed.data.zip || null
  if (parsed.data.guardianName !== undefined) updates.guardian_name = parsed.data.guardianName || null
  if (parsed.data.guardianPhone !== undefined) updates.guardian_phone = parsed.data.guardianPhone || null
  if (parsed.data.guardianEmail !== undefined) updates.guardian_email = parsed.data.guardianEmail || null
  if (parsed.data.guardianRelationship !== undefined) updates.guardian_relationship = parsed.data.guardianRelationship || null
  if (parsed.data.programId !== undefined) updates.program_id = parsed.data.programId || null

  const { error } = await supabase.from('clients').update(updates).eq('id', id)
  if (error) return { data: null, error: error.message }

  revalidatePath(`/staff/clients/${id}`)
  revalidatePath('/staff/clients')
  return { data: undefined, error: null }
}

export async function getClientFormStatus(clientId: string): Promise<ActionResult<FormSetStatus[]>> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('form_assignments')
    .select('form_set, status, due_date')
    .eq('client_id', clientId)

  if (error) return { data: null, error: error.message }

  const FORM_SET_META: Record<string, { label: string; total: number }> = {
    intake: { label: 'Intake', total: 14 },
    '45day': { label: '45-Day Review', total: 4 },
    semiannual: { label: 'Semi-Annual', total: 6 },
    annual: { label: 'Annual', total: 14 },
  }

  const grouped = new Map<string, { completed: number; overdue: number; dueDate: string | null }>()
  for (const key of Object.keys(FORM_SET_META)) {
    grouped.set(key, { completed: 0, overdue: 0, dueDate: null })
  }

  for (const row of data ?? []) {
    const entry = grouped.get(row.form_set)
    if (!entry) continue
    if (row.status === 'completed') entry.completed++
    if (row.status === 'overdue') entry.overdue++
    if (!entry.dueDate) entry.dueDate = row.due_date
  }

  const result: FormSetStatus[] = Object.entries(FORM_SET_META).map(([key, meta]) => {
    const entry = grouped.get(key)!
    return {
      formSet: key as FormSetStatus['formSet'],
      label: meta.label,
      total: meta.total,
      completed: entry.completed,
      overdue: entry.overdue,
      dueDate: entry.dueDate,
    }
  })

  return { data: result, error: null }
}
