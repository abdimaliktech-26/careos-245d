'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { revalidatePath } from 'next/cache'
import { addDays, addMonths } from 'date-fns'
import { getPacketCompliance } from '@/lib/packets/compliance'
import { refreshOverduePackets } from '@/lib/packets/actions'
import { logAuditEvent } from '@/lib/audit/log'
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

const PACKET_META: Record<string, { label: string; dueDate: (intakeDate: Date) => Date }> = {
  intake: { label: 'Intake', dueDate: (date) => date },
  '45_day_review': { label: '45-Day Review', dueDate: (date) => addDays(date, 45) },
  semi_annual_review: { label: 'Semi-Annual', dueDate: (date) => addMonths(date, 6) },
  annual_review: { label: 'Annual', dueDate: (date) => addMonths(date, 12) },
}

const isoDate = (date: Date) => date.toISOString().split('T')[0]

const canManageClients = (role: string) =>
  ['staff', 'program_manager', 'org_admin', 'super_admin'].includes(role)

export async function createClientRecord(
  input: CreateClientInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = createClientSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0].message }
  }

  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !canManageClients(user.role)) {
    return { data: null, error: 'Unauthorized' }
  }
  if (!user.organizationId) {
    return { data: null, error: 'No organization assigned' }
  }

  const supabase = await createServerClient()
  const legalName = `${parsed.data.firstName.trim()} ${parsed.data.lastName.trim()}`.trim()

  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      organization_id: user.organizationId,
      assigned_staff_id: user.id,
      legal_name: legalName,
      date_of_birth: parsed.data.dateOfBirth,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      home_address: parsed.data.address || null,
      city: parsed.data.city || null,
      state: parsed.data.state,
      zip: parsed.data.zip || null,
      guardian_name: parsed.data.guardianName || null,
      guardian_phone: parsed.data.guardianPhone || null,
      guardian_email: parsed.data.guardianEmail || null,
      guardian_relationship: parsed.data.guardianRelationship || null,
      program: parsed.data.program,
      intake_date: parsed.data.intakeDate,
    })
    .select('id')
    .single()

  if (error || !client) {
    return { data: null, error: error?.message ?? 'Failed to create client' }
  }

  await schedulePackets(supabase, client.id, user.organizationId, user.id, new Date(parsed.data.intakeDate))
  await logAuditEvent({
    user,
    action: 'client_created',
    entityType: 'client',
    entityId: client.id,
    entityLabel: legalName,
    details: { program: parsed.data.program, intakeDate: parsed.data.intakeDate },
  }).catch(() => null)

  revalidatePath('/clients')
  revalidatePath('/staff/clients')
  return { data: { id: client.id }, error: null }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function schedulePackets(supabase: any, clientId: string, organizationId: string, userId: string, intakeDate: Date) {
  const { data: templates } = await supabase
    .from('form_templates')
    .select('id, packet_types, sort_order')
    .eq('is_active', true)

  if (!templates?.length) return

  for (const packetType of Object.keys(PACKET_META)) {
    const { data: packet } = await supabase
      .from('packets')
      .insert({
        organization_id: organizationId,
        client_id: clientId,
        packet_type: packetType,
        status: 'not_started',
        due_date: isoDate(PACKET_META[packetType].dueDate(intakeDate)),
        assigned_to: userId,
        review_period_start: packetType === 'intake' ? null : isoDate(intakeDate),
      })
      .select('id')
      .single()

    if (!packet) continue

    const packetForms = templates
      .filter((template: { id: string; packet_types: string[] | null }) =>
        template.packet_types?.includes(packetType)
      )
      .map((template: { id: string; sort_order: number }) => ({
        packet_id: packet.id,
        template_id: template.id,
        status: 'not_started',
        sort_order: template.sort_order,
      }))

    if (packetForms.length > 0) {
      await supabase.from('packet_forms').insert(packetForms)
    }
  }
}

export async function getClients(): Promise<ActionResult<ClientSummary[]>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !canManageClients(user.role)) {
    return { data: null, error: 'Unauthorized' }
  }

  const supabase = await createServerClient()
  const query = supabase
    .from('clients')
    .select('id, legal_name, preferred_name, intake_date, status, program')
    .eq('status', 'active')
    .order('legal_name')

  if (user.organizationId) query.eq('organization_id', user.organizationId)

  const { data, error } = await query
  if (error) return { data: null, error: error.message }
  return { data: data as ClientSummary[], error: null }
}

export async function getClientById(id: string): Promise<ActionResult<ClientDetail>> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
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
  if (sessionError || !user || !canManageClients(user.role)) {
    return { data: null, error: 'Unauthorized' }
  }

  const supabase = await createServerClient()
  const updates: Record<string, unknown> = {}
  const firstName = parsed.data.firstName?.trim()
  const lastName = parsed.data.lastName?.trim()

  if (firstName !== undefined || lastName !== undefined) {
    const { data: existing } = await supabase.from('clients').select('legal_name').eq('id', id).single()
    const [existingFirst = '', ...existingRest] = String(existing?.legal_name ?? '').split(' ')
    updates.legal_name = `${firstName ?? existingFirst} ${lastName ?? existingRest.join(' ')}`.trim()
  }
  if (parsed.data.dateOfBirth !== undefined) updates.date_of_birth = parsed.data.dateOfBirth || null
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone || null
  if (parsed.data.email !== undefined) updates.email = parsed.data.email || null
  if (parsed.data.address !== undefined) updates.home_address = parsed.data.address || null
  if (parsed.data.city !== undefined) updates.city = parsed.data.city || null
  if (parsed.data.state !== undefined) updates.state = parsed.data.state
  if (parsed.data.zip !== undefined) updates.zip = parsed.data.zip || null
  if (parsed.data.guardianName !== undefined) updates.guardian_name = parsed.data.guardianName || null
  if (parsed.data.guardianPhone !== undefined) updates.guardian_phone = parsed.data.guardianPhone || null
  if (parsed.data.guardianEmail !== undefined) updates.guardian_email = parsed.data.guardianEmail || null
  if (parsed.data.guardianRelationship !== undefined) updates.guardian_relationship = parsed.data.guardianRelationship || null
  if (parsed.data.program !== undefined) updates.program = parsed.data.program

  const { error } = await supabase.from('clients').update(updates).eq('id', id)
  if (error) return { data: null, error: error.message }
  await logAuditEvent({
    user,
    action: 'client_updated',
    entityType: 'client',
    entityId: id,
    details: { changedFields: Object.keys(updates) },
  }).catch(() => null)

  revalidatePath(`/clients/${id}`)
  revalidatePath('/clients')
  revalidatePath(`/staff/clients/${id}`)
  revalidatePath('/staff/clients')
  return { data: undefined, error: null }
}

export async function getClientFormStatus(clientId: string): Promise<ActionResult<FormSetStatus[]>> {
  await refreshOverduePackets()
  const supabase = await createServerClient()
  const [{ data, error }, { data: activeTemplates, error: activeTemplatesError }] = await Promise.all([
    supabase
      .from('packets')
      .select('id, packet_type, status, due_date, packet_forms(id, template_id, status, sort_order)')
      .eq('client_id', clientId)
      .order('due_date', { ascending: true }),
    supabase
      .from('form_templates')
      .select('id')
      .eq('is_active', true),
  ])

  if (error) return { data: null, error: error.message }
  if (activeTemplatesError) return { data: null, error: activeTemplatesError.message }

  const activeTemplateIds = new Set((activeTemplates ?? []).map((template) => template.id))

  const result: FormSetStatus[] = Object.entries(PACKET_META).map(([packetType, meta]) => {
    const packet = (data ?? []).find((row) => row.packet_type === packetType)
    const forms = ((packet?.packet_forms ?? []) as Array<{ id: string; template_id: string; status: string; sort_order: number }>)
      .filter((form) => activeTemplateIds.has(form.template_id))
      .toSorted((a, b) => a.sort_order - b.sort_order)
    const firstOpenForm = forms.find((form) => form.status !== 'completed')

    return {
      formSet: packetType as FormSetStatus['formSet'],
      label: meta.label,
      total: forms.length,
      completed: forms.filter((form) => form.status === 'completed').length,
      overdue: getPacketCompliance(packet?.due_date, packet?.status).level === 'overdue' ? 1 : 0,
      dueDate: packet?.due_date ?? null,
      firstPendingAssignmentId: firstOpenForm?.id ?? null,
    }
  })

  return { data: result, error: null }
}
