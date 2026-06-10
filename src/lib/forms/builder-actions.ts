'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { revalidatePath } from 'next/cache'
import type { BuilderTemplate } from '@/types/forms'

type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }

export async function loadTemplate(id: string): Promise<ActionResult<BuilderTemplate>> {
  const { user, error } = await getSession()
  if (error || !user) return { data: null, error: 'Unauthorized' }

  const supabase = await createServerClient()
  const { data: template, error: tErr } = await supabase
    .from('form_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (tErr || !template) return { data: null, error: tErr?.message ?? 'Template not found' }
  if (template.organization_id && template.organization_id !== user.organizationId)
    return { data: null, error: 'Forbidden' }

  const { data: fields } = await supabase
    .from('form_fields')
    .select('*')
    .eq('template_id', id)
    .order('sort_order', { ascending: true })

  return {
    data: {
      id: template.id,
      code: template.code,
      name: template.name,
      description: template.description ?? '',
      packetTypes: template.packet_types ?? [],
      organizationId: template.organization_id,
      fields: (fields ?? []).map((f) => ({
        id: f.id,
        sectionLabel: f.section_label ?? 'General',
        fieldKey: f.field_key,
        label: f.label,
        type: f.field_type,
        isRequired: f.is_required,
        isHipaa: f.is_hipaa ?? false,
        options: (f.options as Array<{ label: string; value: string }>) ?? [],
        placeholder: f.placeholder,
        helpText: f.help_text,
        sortOrder: f.sort_order,
        conditionalOn: f.conditional_on,
        conditionalValue: f.conditional_value,
      })),
    },
    error: null,
  }
}

export async function loadAllTemplates(): Promise<ActionResult<Array<{ id: string; code: string; name: string; description: string | null; is_system: boolean; field_count: number }>>> {
  const { user, error } = await getSession()
  if (error || !user) return { data: null, error: 'Unauthorized' }

  const supabase = await createServerClient()
  const { data: templates } = await supabase
    .from('form_templates')
    .select('id, code, name, description, is_system')
    .or(`organization_id.eq.${user.organizationId},organization_id.is.null`)
    .order('sort_order', { ascending: true })

  const withCounts = await Promise.all(
    (templates ?? []).map(async (t) => {
      const { count } = await supabase
        .from('form_fields')
        .select('*', { count: 'exact', head: true })
        .eq('template_id', t.id)
      return { ...t, field_count: count ?? 0 }
    })
  )

  return { data: withCounts, error: null }
}

export async function saveTemplate(
  template: BuilderTemplate
): Promise<ActionResult<{ id: string }>> {
  const { user, error } = await getSession()
  if (error || !user) return { data: null, error: 'Unauthorized' }
  if (!['org_admin', 'super_admin'].includes(user.role))
    return { data: null, error: 'Only admins can manage form templates' }

  const supabase = await createServerClient()
  const packetTypes = template.packetTypes.length > 0 ? template.packetTypes : null

  if (template.id) {
    const { error: uErr } = await supabase
      .from('form_templates')
      .update({ code: template.code, name: template.name, description: template.description || null, packet_types: packetTypes })
      .eq('id', template.id)
    if (uErr) return { data: null, error: uErr.message }

    await supabase.from('form_fields').delete().eq('template_id', template.id)

    const { error: fErr } = await supabase.from('form_fields').insert(
      template.fields.map((f, i) => ({
        template_id: template.id,
        section_label: f.sectionLabel,
        field_key: f.fieldKey,
        label: f.label,
        field_type: f.type,
        is_required: f.isRequired,
        is_hipaa: f.isHipaa,
        options: f.options.length > 0 ? f.options : null,
        placeholder: f.placeholder,
        help_text: f.helpText,
        sort_order: i,
        conditional_on: f.conditionalOn,
        conditional_value: f.conditionalValue,
      }))
    )
    if (fErr) return { data: null, error: fErr.message }

    revalidatePath('/admin/forms')
    return { data: { id: template.id }, error: null }
  }

  const { data: created, error: cErr } = await supabase
    .from('form_templates')
    .insert({
      organization_id: user.organizationId,
      code: template.code,
      name: template.name,
      description: template.description || null,
      packet_types: packetTypes,
      is_system: false,
    })
    .select('id')
    .single()

  if (cErr || !created) return { data: null, error: cErr?.message ?? 'Failed to create template' }

  if (template.fields.length > 0) {
    const { error: fErr } = await supabase.from('form_fields').insert(
      template.fields.map((f, i) => ({
        template_id: created.id,
        section_label: f.sectionLabel,
        field_key: f.fieldKey,
        label: f.label,
        field_type: f.type,
        is_required: f.isRequired,
        is_hipaa: f.isHipaa,
        options: f.options.length > 0 ? f.options : null,
        placeholder: f.placeholder,
        help_text: f.helpText,
        sort_order: i,
        conditional_on: f.conditionalOn,
        conditional_value: f.conditionalValue,
      }))
    )
    if (fErr) return { data: null, error: fErr.message }
  }

  revalidatePath('/admin/forms')
  return { data: { id: created.id }, error: null }
}

export async function deleteTemplate(id: string): Promise<ActionResult<null>> {
  const { user, error } = await getSession()
  if (error || !user) return { data: null, error: 'Unauthorized' }
  if (!['org_admin', 'super_admin'].includes(user.role))
    return { data: null, error: 'Forbidden' }

  const supabase = await createServerClient()
  const { data: template } = await supabase.from('form_templates').select('is_system, organization_id').eq('id', id).single()
  if (template?.is_system) return { data: null, error: 'Cannot delete system templates' }
  if (template?.organization_id && template.organization_id !== user.organizationId)
    return { data: null, error: 'Forbidden' }

  await supabase.from('form_fields').delete().eq('template_id', id)
  const { error: dErr } = await supabase.from('form_templates').delete().eq('id', id)
  if (dErr) return { data: null, error: dErr.message }

  revalidatePath('/admin/forms')
  return { data: null, error: null }
}
