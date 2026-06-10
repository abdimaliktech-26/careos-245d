'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { revalidatePath } from 'next/cache'
import { logAuditEvent } from '@/lib/audit/log'

export type BillingRule = {
  id: string
  formTemplateCode: string
  cptCode: string
  modifier: string | null
  defaultRate: number | null
  payer: string
  organizationId: string | null
}

export type AutoBillablePacket = {
  packetFormId: string
  packetId: string
  clientId: string
  clientName: string
  formTemplateCode: string
  formTemplateName: string
  completedAt: string
  serviceDate: string
  cptCode: string | null
  rate: number | null
  estimatedAmount: number | null
  packetType: string
}

export async function getBillingRules(orgId?: string): Promise<BillingRule[]> {
  const supabase = await createClient()
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) return []

  const query = supabase
    .from('billing_rules')
    .select('*')
    .order('form_template_code', { ascending: true })

  if (orgId) {
    query.eq('organization_id', orgId)
  } else if (user.organizationId) {
    query.eq('organization_id', user.organizationId)
  }

  const { data } = await query
  return (data ?? []) as BillingRule[]
}

export async function autoGenerateClaim(packetFormId: string): Promise<{ claimId?: string; error: string | null }> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }

  const admin = createAdminClient()

  const { data: packetForm, error: pfError } = await admin
    .from('packet_forms')
    .select('id, packet_id, template_id, status, submitted_at')
    .eq('id', packetFormId)
    .single()

  if (pfError || !packetForm) return { error: pfError?.message ?? 'Packet form not found' }
  if (packetForm.status !== 'completed') return { error: 'Form must be completed to generate a claim' }

  const { data: packet, error: pError } = await admin
    .from('packets')
    .select('id, client_id, organization_id, packet_type')
    .eq('id', packetForm.packet_id)
    .single()

  if (pError || !packet) return { error: pError?.message ?? 'Packet not found' }
  if (packet.organization_id !== user.organizationId) return { error: 'Unauthorized' }

  const { data: template, error: tError } = await admin
    .from('form_templates')
    .select('id, code, name')
    .eq('id', packetForm.template_id)
    .single()

  if (tError || !template) return { error: tError?.message ?? 'Template not found' }

  const rules = await getBillingRules(user.organizationId)
  const matchingRule = rules.find(r => r.formTemplateCode === template.code)

  if (!matchingRule) return { error: `No billing rule configured for form template ${template.code}` }

  const { data: client, error: cError } = await admin
    .from('clients')
    .select('legal_name')
    .eq('id', packet.client_id)
    .single()

  if (cError || !client) return { error: cError?.message ?? 'Client not found' }

  const serviceDate = (packetForm.submitted_at ?? new Date().toISOString()).split('T')[0]
  const estimatedAmount = matchingRule.defaultRate ?? null

  const claimNumber = `CLM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

  const { data: claim, error: insertError } = await admin
    .from('claims')
    .insert({
      organization_id: user.organizationId,
      client_id: packet.client_id,
      claim_number: claimNumber,
      payer: matchingRule.payer,
      cpt_code: matchingRule.cptCode,
      modifier: matchingRule.modifier,
      rate: estimatedAmount,
      amount: estimatedAmount,
      service_date: serviceDate,
      status: 'draft',
      notes: `Auto-generated from completed form: ${template.code} - ${template.name}`,
    })
    .select('id')
    .single()

  if (insertError) return { error: insertError.message }

  await logAuditEvent({
    user,
    action: 'form_submitted',
    entityType: 'claim',
    entityId: claim.id,
    entityLabel: `Auto-generated claim ${claimNumber} from ${template.code}`,
    details: { packetFormId, templateCode: template.code, cptCode: matchingRule.cptCode, amount: estimatedAmount },
  }).catch(() => null)

  revalidatePath('/billing-readiness/claims')
  revalidatePath('/billing-readiness/auto-bill')
  return { claimId: claim.id, error: null }
}

export async function getAutoBillablePackets(orgId?: string): Promise<AutoBillablePacket[]> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) return []

  const admin = createAdminClient()
  const orgIdentifier = orgId ?? user.organizationId
  if (!orgIdentifier) return []

  const rules = await getBillingRules(orgIdentifier)
  const ruleCodes = new Set(rules.map(r => r.formTemplateCode))
  if (ruleCodes.size === 0) return []

  const { data: packetForms, error: pfError } = await admin
    .from('packet_forms')
    .select(`
      id,
      packet_id,
      template_id,
      status,
      submitted_at,
      form_templates!inner(code, name)
    `)
    .in('status', ['completed'])
    .order('submitted_at', { ascending: false })

  if (pfError || !packetForms) return []

  const filtered = packetForms.filter(pf => {
    const template = Array.isArray(pf.form_templates) ? pf.form_templates[0] : pf.form_templates
    return template && ruleCodes.has(template.code)
  })

  const packetIds = [...new Set(filtered.map(pf => pf.packet_id))]
  const templateIds = [...new Set(filtered.map(pf => pf.template_id))]

  const [{ data: packets }, { data: templates }] = await Promise.all([
    packetIds.length > 0
      ? admin.from('packets').select('id, client_id, packet_type').in('id', packetIds)
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { data: [] as any[] },
    templateIds.length > 0
      ? admin.from('form_templates').select('id, code, name').in('id', templateIds)
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { data: [] as any[] },
  ])

  const clientIds = [...new Set(packets?.map(p => p.client_id) ?? [])]
  const { data: clients } = clientIds.length > 0
    ? await admin.from('clients').select('id, legal_name').in('id', clientIds)
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { data: [] as any[] }

  const clientMap = new Map(clients?.map(c => [c.id, c.legal_name]) ?? [])
  const packetMap = new Map(packets?.map(p => [p.id, p]) ?? [])
  const existingResults: Array<{ count: number }> = []
  const ruleByCode = new Map(templates?.map((t: Record<string, unknown>) => [t.code, t]) ?? [])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = []

  for (let i = 0; i < filtered.length; i++) {
    const pf = filtered[i]
    const template = Array.isArray(pf.form_templates) ? pf.form_templates[0] : pf.form_templates
    if (!template) continue

    const pkt = packetMap.get(pf.packet_id)
    if (!pkt) continue

    const existingCount = existingResults[i]?.count ?? 0
    if (existingCount > 0) continue

    const rule = ruleByCode.get(template.code)
    if (!rule) continue

    results.push({
      packetFormId: pf.id,
      packetId: pf.packet_id,
      clientId: pkt.client_id,
      clientName: clientMap.get(pkt.client_id) ?? 'Unknown',
      formTemplateCode: template.code,
      formTemplateName: template.name,
      completedAt: pf.submitted_at,
      serviceDate: (pf.submitted_at ?? '').split('T')[0],
      cptCode: rule.cptCode,
      rate: rule.defaultRate,
      estimatedAmount: rule.defaultRate,
      packetType: pkt.packet_type,
    })
  }

  return results
}

export async function batchGenerateClaims(packetFormIds: string[]): Promise<{ claimIds: string[]; errors: string[] }> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) return { claimIds: [], errors: ['Unauthorized'] }

  const claimIds: string[] = []
  const errors: string[] = []

  for (const pfId of packetFormIds) {
    const result = await autoGenerateClaim(pfId)
    if (result.claimId) {
      claimIds.push(result.claimId)
    } else if (result.error) {
      errors.push(`${pfId}: ${result.error}`)
    }
  }

  revalidatePath('/billing-readiness/auto-bill')
  return { claimIds, errors }
}

export async function getClaimsByClient(clientId: string): Promise<Record<string, unknown>[]> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return []

  const supabase = await createClient()
  const { data } = await supabase
    .from('claims')
    .select('*')
    .eq('organization_id', user.organizationId)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  return (data ?? []) as Record<string, unknown>[]
}
