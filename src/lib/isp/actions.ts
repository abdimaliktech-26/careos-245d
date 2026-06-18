'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { logAuditEvent } from '@/lib/audit/log'
import { canActivate, nextStatuses } from './status'
import { planFormSchema, serviceSchema, riskSchema, signSchema, type PlanStatus } from './types'

type Result<T> = { data: T; error: null } | { data: null; error: string }

const WRITE_ROLES = ['program_manager', 'org_admin', 'super_admin']

async function requireWriter() {
  const { user, error } = await getSession()
  if (error || !user || !user.organizationId || !WRITE_ROLES.includes(user.role)) return null
  return user
}

export async function createPlan(input: unknown): Promise<Result<{ id: string }>> {
  const user = await requireWriter()
  if (!user) return { data: null, error: 'Unauthorized' }
  const parsed = planFormSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const supabase = await createClient()
  const { data, error } = await supabase.from('service_plans').insert({
    organization_id: user.organizationId,
    client_id: parsed.data.clientId,
    plan_type: parsed.data.planType ?? 'CSSP',
    assessed_needs: parsed.data.assessedNeeds ?? null,
    summary: parsed.data.summary ?? null,
    effective_date: parsed.data.effectiveDate || null,
    review_date: parsed.data.reviewDate || null,
    annual_review_date: parsed.data.annualReviewDate || null,
    created_by: user.id,
  }).select('id').single()
  if (error || !data) return { data: null, error: error?.message ?? 'Failed to create plan' }

  await logAuditEvent({ user, action: 'isp_created', entityType: 'service_plan', entityId: data.id, entityLabel: 'ISP created' }).catch(() => null)
  revalidatePath(`/clients/${parsed.data.clientId}/isp`)
  return { data: { id: data.id }, error: null }
}

export async function updatePlan(planId: string, clientId: string, input: unknown): Promise<Result<void>> {
  const user = await requireWriter()
  if (!user) return { data: null, error: 'Unauthorized' }
  const parsed = planFormSchema.partial().safeParse(input)
  if (!parsed.success) return { data: null, error: 'Invalid input' }
  const supabase = await createClient()
  const { error } = await supabase.from('service_plans').update({
    plan_type: parsed.data.planType ?? undefined,
    assessed_needs: parsed.data.assessedNeeds ?? undefined,
    summary: parsed.data.summary ?? undefined,
    effective_date: parsed.data.effectiveDate || undefined,
    review_date: parsed.data.reviewDate || undefined,
    annual_review_date: parsed.data.annualReviewDate || undefined,
    updated_at: new Date().toISOString(),
  }).eq('id', planId)
  if (error) return { data: null, error: error.message }
  revalidatePath(`/clients/${clientId}/isp/${planId}`)
  return { data: undefined, error: null }
}

export async function addService(planId: string, clientId: string, input: unknown): Promise<Result<void>> {
  const user = await requireWriter()
  if (!user) return { data: null, error: 'Unauthorized' }
  const parsed = serviceSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  const supabase = await createClient()
  const { error } = await supabase.from('plan_services').insert({
    service_plan_id: planId, organization_id: user.organizationId,
    service_name: parsed.data.serviceName, frequency: parsed.data.frequency ?? null,
    units: parsed.data.units ?? null, responsible_party: parsed.data.responsibleParty ?? null,
    notes: parsed.data.notes ?? null,
  })
  if (error) return { data: null, error: error.message }
  revalidatePath(`/clients/${clientId}/isp/${planId}`)
  return { data: undefined, error: null }
}

export async function removeService(serviceId: string, planId: string, clientId: string): Promise<Result<void>> {
  const user = await requireWriter()
  if (!user) return { data: null, error: 'Unauthorized' }
  const supabase = await createClient()
  const { error } = await supabase.from('plan_services').delete().eq('id', serviceId)
  if (error) return { data: null, error: error.message }
  revalidatePath(`/clients/${clientId}/isp/${planId}`)
  return { data: undefined, error: null }
}

export async function linkOutcome(planId: string, clientId: string, goalId: string): Promise<Result<void>> {
  const user = await requireWriter()
  if (!user) return { data: null, error: 'Unauthorized' }
  const supabase = await createClient()
  const { error } = await supabase.from('plan_outcomes').insert({
    service_plan_id: planId, organization_id: user.organizationId, goal_id: goalId,
  })
  if (error) return { data: null, error: error.message }
  revalidatePath(`/clients/${clientId}/isp/${planId}`)
  return { data: undefined, error: null }
}

export async function unlinkOutcome(outcomeId: string, planId: string, clientId: string): Promise<Result<void>> {
  const user = await requireWriter()
  if (!user) return { data: null, error: 'Unauthorized' }
  const supabase = await createClient()
  const { error } = await supabase.from('plan_outcomes').delete().eq('id', outcomeId)
  if (error) return { data: null, error: error.message }
  revalidatePath(`/clients/${clientId}/isp/${planId}`)
  return { data: undefined, error: null }
}

export async function addRisk(planId: string, clientId: string, input: unknown): Promise<Result<void>> {
  const user = await requireWriter()
  if (!user) return { data: null, error: 'Unauthorized' }
  const parsed = riskSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  const supabase = await createClient()
  const { error } = await supabase.from('plan_risks').insert({
    service_plan_id: planId, organization_id: user.organizationId,
    risk: parsed.data.risk, mitigation: parsed.data.mitigation ?? null, severity: parsed.data.severity ?? null,
  })
  if (error) return { data: null, error: error.message }
  revalidatePath(`/clients/${clientId}/isp/${planId}`)
  return { data: undefined, error: null }
}

export async function removeRisk(riskId: string, planId: string, clientId: string): Promise<Result<void>> {
  const user = await requireWriter()
  if (!user) return { data: null, error: 'Unauthorized' }
  const supabase = await createClient()
  const { error } = await supabase.from('plan_risks').delete().eq('id', riskId)
  if (error) return { data: null, error: error.message }
  revalidatePath(`/clients/${clientId}/isp/${planId}`)
  return { data: undefined, error: null }
}

export async function activatePlan(planId: string, clientId: string): Promise<Result<void>> {
  const user = await requireWriter()
  if (!user) return { data: null, error: 'Unauthorized' }
  const supabase = await createClient()
  const { data: plan } = await supabase.from('service_plans').select('effective_date, status').eq('id', planId).maybeSingle()
  if (!plan) return { data: null, error: 'Plan not found' }
  if (!nextStatuses(plan.status as PlanStatus).includes('active')) return { data: null, error: `Cannot activate from ${plan.status}.` }

  const [{ count: serviceCount }, { count: outcomeCount }] = await Promise.all([
    supabase.from('plan_services').select('*', { count: 'exact', head: true }).eq('service_plan_id', planId),
    supabase.from('plan_outcomes').select('*', { count: 'exact', head: true }).eq('service_plan_id', planId),
  ])
  const check = canActivate({ effectiveDate: plan.effective_date, serviceCount: serviceCount ?? 0, outcomeCount: outcomeCount ?? 0 })
  if (!check.ok) return { data: null, error: check.reasons.join(' ') }

  const { error } = await supabase.from('service_plans')
    .update({ status: 'active', activated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', planId)
  if (error) return { data: null, error: error.message }
  await logAuditEvent({ user, action: 'isp_activated', entityType: 'service_plan', entityId: planId, entityLabel: 'ISP activated' }).catch(() => null)
  revalidatePath(`/clients/${clientId}/isp/${planId}`)
  return { data: undefined, error: null }
}

export async function setReviewStatus(planId: string, clientId: string, target: PlanStatus): Promise<Result<void>> {
  const user = await requireWriter()
  if (!user) return { data: null, error: 'Unauthorized' }
  const supabase = await createClient()
  const { data: plan } = await supabase.from('service_plans').select('status').eq('id', planId).maybeSingle()
  if (!plan) return { data: null, error: 'Plan not found' }
  if (!nextStatuses(plan.status as PlanStatus).includes(target)) return { data: null, error: `Cannot move from ${plan.status} to ${target}.` }
  const { error } = await supabase.from('service_plans').update({ status: target, updated_at: new Date().toISOString() }).eq('id', planId)
  if (error) return { data: null, error: error.message }
  revalidatePath(`/clients/${clientId}/isp/${planId}`)
  return { data: undefined, error: null }
}

export async function signPlan(planId: string, clientId: string, input: unknown): Promise<Result<void>> {
  const user = await requireWriter()
  if (!user) return { data: null, error: 'Unauthorized' }
  const parsed = signSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  const supabase = await createClient()
  const { error } = await supabase.from('plan_signatures').insert({
    service_plan_id: planId, organization_id: user.organizationId,
    signer_role: parsed.data.signerRole, signer_name: parsed.data.signerName,
    signer_user_id: user.id, signature_data: parsed.data.signatureData ?? null,
  })
  if (error) return { data: null, error: error.message }
  await logAuditEvent({ user, action: 'isp_signed', entityType: 'service_plan', entityId: planId, entityLabel: `Signed (${parsed.data.signerRole})` }).catch(() => null)
  revalidatePath(`/clients/${clientId}/isp/${planId}`)
  return { data: undefined, error: null }
}
