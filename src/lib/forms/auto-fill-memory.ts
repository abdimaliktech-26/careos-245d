import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'

export type PreviousResponse = {
  fieldKey: string
  value: string | null
  valueJson: unknown
  updatedAt: string
}

export type CarryForwardSuggestion = {
  fieldKey: string
  label: string
  previousValue: unknown
  confidence: 'high' | 'medium' | 'low'
}

export type ContextSummary = {
  clientId: string
  clientName: string
  program: string
  guardianshipStatus: string | null
  recentResponses: Array<{ templateName: string; fieldKey: string; label: string; value: string }>
}

export async function getPreviousResponses(
  clientId: string,
  templateCode: string
): Promise<PreviousResponse[] | null> {
  const supabase = await createClient()

  const { data: template } = await supabase
    .from('form_templates')
    .select('id')
    .eq('code', templateCode)
    .single()

  if (!template) return null

  const { data: previousForms } = await supabase
    .from('packet_forms')
    .select(`
      id,
      form_responses(field_key, value, value_json, updated_at),
      packets!inner(client_id, status)
    `)
    .eq('packets.client_id', clientId)
    .eq('template_id', template.id)
    .eq('packets.status', 'completed')
    .order('updated_at', { ascending: false })
    .limit(1)

  const formRows = (previousForms ?? []) as Array<Record<string, unknown>>
  if (formRows.length === 0) return null

  const latestForm = formRows[0]
  const responses = (latestForm.form_responses ?? []) as Array<{
    field_key: string
    value: string | null
    value_json: unknown
    updated_at: string
  }>

  return responses.map((r) => ({
    fieldKey: r.field_key,
    value: r.value,
    valueJson: r.value_json,
    updatedAt: r.updated_at,
  }))
}

export async function getCarryForwardSuggestions(
  clientId: string,
  templateCode: string,
  currentFieldKeys: string[]
): Promise<CarryForwardSuggestion[]> {
  const previousResponses = await getPreviousResponses(clientId, templateCode)
  if (!previousResponses) return []

  const supabase = await createClient()

  const { data: template } = await supabase
    .from('form_templates')
    .select('id')
    .eq('code', templateCode)
    .single()

  const fieldLabels = new Map<string, string>()
  if (template) {
    const { data: fields } = await supabase
      .from('form_fields')
      .select('field_key, label')
      .eq('template_id', template.id)

    const fieldRows = (fields ?? []) as Array<{ field_key: string; label: string }>
    for (const f of fieldRows) {
      fieldLabels.set(f.field_key, f.label)
    }
  }

  const previousMap = new Map(previousResponses.map((r) => [r.fieldKey, r]))
  const suggestions: CarryForwardSuggestion[] = []

  const skipFields = new Set(['sig_client', 'sig_guardian', 'sig_staff', 'sig_case_manager', 'sig_witness', 'sig_agency_rep'])

  for (const key of currentFieldKeys) {
    if (skipFields.has(key)) continue
    const prev = previousMap.get(key)
    if (!prev) continue

    const value = prev.valueJson !== null && prev.valueJson !== undefined ? prev.valueJson : prev.value
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) continue

    const label = fieldLabels.get(key) ?? key
    const confidence = label.toLowerCase().includes('name') || label.toLowerCase().includes('date') || key.includes('program') || key.includes('county') || key.includes('waiver')
      ? 'high'
      : key.includes('notes') || key.includes('description') || key.includes('narrative')
        ? 'medium'
        : 'high'

    suggestions.push({ fieldKey: key, label, previousValue: value, confidence })
  }

  return suggestions
}

export async function applyCarryForward(
  packetFormId: string,
  suggestions: CarryForwardSuggestion[]
): Promise<boolean> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) return false

  const supabase = await createClient()

  const rows = suggestions.map((s) => ({
    packet_form_id: packetFormId,
    field_key: s.fieldKey,
    value: typeof s.previousValue === 'string' ? s.previousValue : null,
    value_json: typeof s.previousValue !== 'string' ? s.previousValue : null,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }))

  for (const row of rows) {
    const { error } = await supabase.from('form_responses').upsert(
      row,
      { onConflict: 'packet_form_id, field_key' }
    )
    if (error) return false
  }

  return true
}

export async function getContextSummary(clientId: string): Promise<ContextSummary | null> {
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, legal_name, program, guardianship_status')
    .eq('id', clientId)
    .single()

  if (!client) return null

  const { data: recentForms } = await supabase
    .from('packet_forms')
    .select(`
      form_responses(field_key, value, value_json),
      form_templates(name, form_fields(field_key, label))
    `)
    .eq('packet_forms.status', 'completed')
    .order('updated_at', { ascending: false })
    .limit(5)

  const formRows = (recentForms ?? []) as Array<Record<string, unknown>>
  const recentResponses: ContextSummary['recentResponses'] = []

  for (const form of formRows) {
    const template = form.form_templates as { name?: string; form_fields?: Array<{ field_key: string; label: string }> } | null
    const templateName = template?.name ?? 'Unknown Form'
    const fieldLabels = new Map(
      (template?.form_fields ?? []).map((f: { field_key: string; label: string }) => [f.field_key, f.label])
    )
    const responses = (form.form_responses ?? []) as Array<{ field_key: string; value: string | null; value_json: unknown }>

    for (const r of responses) {
      const value = r.value_json !== null && r.value_json !== undefined ? String(r.value_json) : r.value
      if (!value) continue
      recentResponses.push({
        templateName,
        fieldKey: r.field_key,
        label: fieldLabels.get(r.field_key) ?? r.field_key,
        value: value.slice(0, 200),
      })
    }
  }

  return {
    clientId: client.id,
    clientName: client.legal_name,
    program: client.program,
    guardianshipStatus: client.guardianship_status,
    recentResponses,
  }
}
