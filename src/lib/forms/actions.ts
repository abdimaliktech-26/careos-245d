'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { revalidatePath } from 'next/cache'
import { storeCompletedFormDocument } from '@/lib/documents/form-documents'
import { getPacketCompliance } from '@/lib/packets/compliance'
import { validateRequiredSignatures } from '@/lib/forms/signature-validation'
import { logAuditEvent } from '@/lib/audit/log'
import { autoGenerateClaim } from '@/lib/billing/auto-billing'
import { runIntakeValidation } from '@/lib/agent/pipeline'
import type { FieldType, FormSchema } from '@/types/forms'

type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }

type FormFieldRow = {
  field_key: string
  label: string
  field_type: FieldType
  is_required: boolean
  placeholder: string | null
  help_text: string | null
  options: Array<{ label: string; value: string }> | null
  section_label: string | null
  sort_order: number
}

export type PacketFormWithTemplate = {
  id: string
  packet_id: string
  due_date: string
  status: string
  packet_type: string
  form_templates: {
    id: string
    code: string
    name: string
    description: string | null
    sort_order: number
    form_fields: FormFieldRow[]
  }
}

function buildSchema(template: PacketFormWithTemplate['form_templates']): FormSchema {
  const sections = new Map<string, FormFieldRow[]>()
  for (const field of template.form_fields.toSorted((a, b) => a.sort_order - b.sort_order)) {
    const title = field.section_label ?? 'General'
    sections.set(title, [...(sections.get(title) ?? []), field])
  }

  return {
    title: template.name,
    description: template.description ?? undefined,
    sections: Array.from(sections.entries()).map(([title, fields]) => ({
      title,
      fields: fields.map((field) => ({
        id: field.field_key,
        label: field.label,
        type: field.field_type,
        required: field.is_required,
        placeholder: field.placeholder ?? undefined,
        helpText: field.help_text ?? undefined,
        options: field.options?.map((option) => option.label) ?? undefined,
      })),
    })),
  }
}

export async function getPacketForm(
  packetFormId: string
): Promise<ActionResult<{ packetForm: PacketFormWithTemplate; schema: FormSchema }>> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('packet_forms')
    .select(`
      id,
      packet_id,
      status,
      packets(packet_type, due_date),
      form_templates(
        id,
        code,
        name,
        description,
        sort_order,
        form_fields(field_key, label, field_type, is_required, placeholder, help_text, options, section_label, sort_order)
      )
    `)
    .eq('id', packetFormId)
    .single()

  if (error || !data) return { data: null, error: error?.message ?? 'Not found' }

  const packet = Array.isArray(data.packets) ? data.packets[0] : data.packets
  const template = Array.isArray(data.form_templates) ? data.form_templates[0] : data.form_templates
  if (!packet || !template) return { data: null, error: 'Packet form is missing template metadata' }

  const packetForm = {
    id: data.id,
    packet_id: data.packet_id,
    status: data.status,
    due_date: packet.due_date,
    packet_type: packet.packet_type,
    form_templates: template,
  } as PacketFormWithTemplate

  return { data: { packetForm, schema: buildSchema(packetForm.form_templates) }, error: null }
}

export const getFormAssignment = getPacketForm

export async function getExistingDraft(
  packetFormId: string
): Promise<ActionResult<{ id: string; form_data: Record<string, unknown>; status: string } | null>> {
  const supabase = await createServerClient()
  const [{ data: packetForm, error: formError }, { data: responses, error: responsesError }] = await Promise.all([
    supabase.from('packet_forms').select('id, status').eq('id', packetFormId).maybeSingle(),
    supabase.from('form_responses').select('field_key, value, value_json').eq('packet_form_id', packetFormId),
  ])

  if (formError) return { data: null, error: formError.message }
  if (responsesError) return { data: null, error: responsesError.message }
  if (!packetForm) return { data: null, error: null }

  const formData = Object.fromEntries(
    (responses ?? []).map((response) => [
      response.field_key,
      response.value_json ?? response.value ?? '',
    ])
  )

  return { data: { id: packetForm.id, form_data: formData, status: packetForm.status }, error: null }
}

async function upsertResponses(
  packetFormId: string,
  formData: Record<string, unknown>,
  userId: string
) {
  const supabase = await createServerClient()
  const rows = Object.entries(formData).map(([fieldKey, value]) => ({
    packet_form_id: packetFormId,
    field_key: fieldKey,
    value: typeof value === 'string' ? value : null,
    value_json: typeof value === 'string' ? null : value,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  }))

  if (rows.length === 0) return { error: null }
  return supabase.from('form_responses').upsert(rows, { onConflict: 'packet_form_id,field_key' })
}

export async function saveFormDraft(
  packetFormId: string,
  clientId: string,
  _templateId: string,
  formData: Record<string, unknown>,
  _existingSubmissionId?: string
): Promise<ActionResult<{ id: string }>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !['staff', 'program_manager', 'org_admin'].includes(user.role)) {
    return { data: null, error: 'Unauthorized' }
  }

  const supabase = await createServerClient()
  const { error: responseError } = await upsertResponses(packetFormId, formData, user.id)
  if (responseError) return { data: null, error: responseError.message }

  const { error } = await supabase
    .from('packet_forms')
    .update({ status: 'in_progress', last_edited_by: user.id, last_edited_at: new Date().toISOString() })
    .eq('id', packetFormId)

  if (error) return { data: null, error: error.message }
  await logAuditEvent({
    user,
    action: 'form_saved',
    entityType: 'packet_form',
    entityId: packetFormId,
    details: { responseCount: Object.keys(formData).length },
  }).catch(() => null)
  revalidatePath(`/clients/${clientId}`)
  return { data: { id: packetFormId }, error: null }
}

export async function submitFormForSignatures(
  packetFormId: string,
  clientId: string,
  _templateId: string,
  formData: Record<string, unknown>,
  _existingSubmissionId?: string
): Promise<ActionResult<{ submissionId: string }>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !['staff', 'program_manager', 'org_admin'].includes(user.role)) {
    return { data: null, error: 'Unauthorized' }
  }

  const supabase = await createServerClient()
  const { error: responseError } = await upsertResponses(packetFormId, formData, user.id)
  if (responseError) return { data: null, error: responseError.message }

  // Agent validation: deterministic checks + audit log run before advancing to
  // signatures. Fail-closed — a hard-fail or an audit-write failure blocks submit.
  if (user.organizationId) {
    const [{ data: fieldRows }, { data: client }] = await Promise.all([
      supabase
        .from('form_fields')
        .select('field_key, label, is_required, conditional_on, conditional_value')
        .eq('template_id', _templateId),
      supabase
        .from('clients')
        .select('id, program, waiver_type, county_of_service, service_start_date, guardianship_status, guardian_name')
        .eq('id', clientId)
        .maybeSingle(),
    ])

    const today = new Date().toISOString().slice(0, 10)
    let validation
    try {
      validation = await runIntakeValidation(
        {
          subjectId: packetFormId,
          clientId: client?.id ?? clientId ?? null,
          fields: fieldRows ?? [],
          formData,
          eligibility: {
            program: client?.program ?? null,
            waiver_type: client?.waiver_type ?? null,
            county_of_service: client?.county_of_service ?? null,
            service_start_date: client?.service_start_date ?? null,
            guardianship_status: client?.guardianship_status ?? null,
            guardian_name: client?.guardian_name ?? null,
            today,
          },
          router: {
            waiver_type: client?.waiver_type ?? null,
            requested_service: (formData['requested_service'] as string) ?? null,
            current_program: client?.program ?? null,
          },
        },
        { organizationId: user.organizationId, userId: user.id, user },
      )
    } catch {
      return { data: null, error: 'Validation/audit failed; submission not recorded. Please retry.' }
    }

    if (validation.verdict === 'fail') {
      return { data: null, error: `Submission blocked by validation: ${validation.run.flags.map((f) => f.message).join(' ')}` }
    }
  }

  const { data: packetForm, error } = await supabase
    .from('packet_forms')
    .update({
      status: 'needs_signature',
      last_edited_by: user.id,
      last_edited_at: new Date().toISOString(),
      submitted_by: user.id,
      submitted_at: new Date().toISOString(),
    })
    .eq('id', packetFormId)
    .select('packet_id')
    .single()

  if (error || !packetForm) return { data: null, error: error?.message ?? 'Failed to submit' }

  await supabase.from('packets').update({ status: 'needs_signature' }).eq('id', packetForm.packet_id)
  await logAuditEvent({
    user,
    action: 'form_submitted',
    entityType: 'packet_form',
    entityId: packetFormId,
    details: { responseCount: Object.keys(formData).length },
  }).catch(() => null)

  revalidatePath(`/clients/${clientId}`)
  return { data: { submissionId: packetFormId }, error: null }
}

export async function captureSignatureAndComplete(
  packetFormId: string,
  _assignmentId: string,
  clientId: string,
  signerName: string,
  signerType: 'client' | 'guardian' | 'case_manager',
  signatureData: string
): Promise<ActionResult<{ completed: boolean; alert: string | null }>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) return { data: null, error: 'Unauthorized' }
  if (!user.organizationId) return { data: null, error: 'No organization' }

  // Only case managers can sign internally. Client/guardian use the external portal.
  if (signerType !== 'case_manager') {
    return { data: null, error: 'Only case managers can sign here. Client/guardian signatures must be collected via the secure signing link.' }
  }

  const supabase = await createServerClient()
  const { data: packetForm, error: packetFormError } = await supabase
    .from('packet_forms')
    .select('packet_id')
    .eq('id', packetFormId)
    .single()

  if (packetFormError || !packetForm) {
    return { data: null, error: packetFormError?.message ?? 'Packet form not found' }
  }

  const { error: sigError } = await supabase
    .from('signatures')
    .insert({
      organization_id: user.organizationId,
      packet_id: packetForm.packet_id,
      packet_form_id: packetFormId,
      signer_role: signerType,
      signer_name: signerName,
      user_id: user.id,
      signature_data: signatureData,
    })

  if (sigError) return { data: null, error: sigError.message }

  const { data: signatures, error: signaturesError } = await supabase
    .from('signatures')
    .select('signer_role')
    .eq('packet_form_id', packetFormId)

  if (signaturesError) return { data: null, error: signaturesError.message }

  const validation = validateRequiredSignatures(signatures ?? [])
  const nextFormStatus = validation.isValid ? 'completed' : 'needs_signature'
  const { error: formError } = await supabase
    .from('packet_forms')
    .update({ status: nextFormStatus })
    .eq('id', packetFormId)

  if (formError) return { data: null, error: formError.message }

  const { count } = await supabase
    .from('packet_forms')
    .select('*', { count: 'exact', head: true })
    .eq('packet_id', packetForm.packet_id)
    .neq('status', 'completed')

  const { data: packet } = await supabase
    .from('packets')
    .select('due_date')
    .eq('id', packetForm.packet_id)
    .single()
  const openStatus = getPacketCompliance(packet?.due_date, 'in_progress').level === 'overdue'
    ? 'overdue'
    : nextFormStatus === 'needs_signature' ? 'needs_signature' : 'in_progress'

  const packetComplete = validation.isValid && count === 0
  await supabase
    .from('packets')
    .update({
      status: packetComplete ? 'completed' : openStatus,
      completed_date: packetComplete ? new Date().toISOString().split('T')[0] : null,
    })
    .eq('id', packetForm.packet_id)

  if (validation.isValid) {
    await storeCompletedFormDocument(packetFormId).catch(() => null)
    await autoGenerateClaim(packetFormId).catch(() => null)
  }
  await logAuditEvent({
    user,
    action: 'signature_completed',
    entityType: 'packet_form',
    entityId: packetFormId,
    details: { signerType, completed: validation.isValid, missing: validation.missing },
  }).catch(() => null)

  revalidatePath(`/clients/${clientId}`)
  return { data: { completed: validation.isValid, alert: validation.alert }, error: null }
}
