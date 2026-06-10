'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession } from '@/lib/auth/get-session'
import { logAuditEvent } from '@/lib/audit/log'
import { createClient } from '@/lib/supabase/server'
import { deliverWebhook } from '@/lib/notifications/webhooks'

type ActionState = {
  error: string | null
  success?: string | null
}

const incidentSchema = z.object({
  clientId: z.string().uuid().optional().or(z.literal('')),
  category: z.enum([
    'injury', 'medication_error', 'behavioral_incident',
    'emergency_manual_restraint', 'maltreatment_concern',
    'death', 'property_damage', 'elopement', 'other',
  ]),
  occurredAt: z.string().min(1, 'Incident date/time is required'),
  location: z.string().max(180).optional(),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  immediateActions: z.string().max(3000).optional(),
  guardianNotified: z.boolean(),
  caseManagerNotified: z.boolean(),
  dhsReported: z.boolean(),
  followUpRequired: z.boolean(),
  followUpDueDate: z.string().optional().or(z.literal('')),
  followUpNotes: z.string().max(3000).optional(),
})

const updateSchema = incidentSchema.extend({
  incidentId: z.string().uuid(),
  status: z.enum(['open', 'under_review', 'reported_to_state', 'closed']),
  dhsReportNumber: z.string().optional().or(z.literal('')),
  staffInvolved: z.array(z.string()).optional(),
})

const statusSchema = z.object({
  incidentId: z.string().uuid(),
  status: z.enum(['open', 'under_review', 'closed', 'reported_to_state']),
})

function checkbox(formData: FormData, key: string) {
  return formData.get(key) === 'on'
}

function generateIncidentNumber() {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replaceAll('-', '')
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `INC-${date}-${suffix}`
}

export async function createIncident(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }
  if (!['staff', 'program_manager', 'org_admin', 'super_admin'].includes(user.role)) return { error: 'Unauthorized' }

  const parsed = incidentSchema.safeParse({
    clientId: formData.get('clientId') as string,
    category: formData.get('category') as string,
    occurredAt: formData.get('occurredAt') as string,
    location: (formData.get('location') as string) || undefined,
    description: formData.get('description') as string,
    immediateActions: (formData.get('immediateActions') as string) || undefined,
    guardianNotified: checkbox(formData, 'guardianNotified'),
    caseManagerNotified: checkbox(formData, 'caseManagerNotified'),
    dhsReported: checkbox(formData, 'dhsReported'),
    followUpRequired: checkbox(formData, 'followUpRequired'),
    followUpDueDate: (formData.get('followUpDueDate') as string) || '',
    followUpNotes: (formData.get('followUpNotes') as string) || undefined,
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('incidents')
    .insert({
      organization_id: user.organizationId,
      client_id: parsed.data.clientId || null,
      incident_number: generateIncidentNumber(),
      category: parsed.data.category,
      status: 'open',
      occurred_at: new Date(parsed.data.occurredAt).toISOString(),
      location: parsed.data.location || null,
      description: parsed.data.description,
      immediate_actions: parsed.data.immediateActions || null,
      reported_by: user.id,
      guardian_notified: parsed.data.guardianNotified,
      guardian_notified_at: parsed.data.guardianNotified ? now : null,
      case_manager_notified: parsed.data.caseManagerNotified,
      case_manager_notified_at: parsed.data.caseManagerNotified ? now : null,
      dhs_reported: parsed.data.dhsReported,
      dhs_reported_at: parsed.data.dhsReported ? now : null,
      follow_up_required: parsed.data.followUpRequired,
      follow_up_due_date: parsed.data.followUpDueDate || null,
      follow_up_notes: parsed.data.followUpNotes || null,
    })
    .select('id, incident_number')
    .single()

  if (error || !data) return { error: error?.message ?? 'Failed to create incident' }

  await logAuditEvent({
    user,
    action: 'incident_submitted',
    entityType: 'incident',
    entityId: data.id,
    entityLabel: data.incident_number ?? 'Incident',
    details: { category: parsed.data.category, clientId: parsed.data.clientId || null },
  }).catch(() => null)

  // Fire webhook for incident.reported
  deliverWebhook(
    user.organizationId,
    'slack',
    '',
    'incident.reported',
    `Incident: ${data.incident_number}`,
    `New ${parsed.data.category} incident reported.`,
    { incidentId: data.id, category: parsed.data.category }
  ).catch(() => {})

  revalidatePath('/incidents')
  revalidatePath('/dashboard')
  revalidatePath('/admin/audit-assistant')
  return { error: null, success: `Incident ${data.incident_number ?? ''} created.` }
}

export async function updateIncident(_previousState: { error: string | null; success?: boolean }, formData: FormData): Promise<{ error: string | null; success?: boolean }> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }

  const staffInvolvedRaw = formData.getAll('staffInvolved') as string[]

  const parsed = updateSchema.safeParse({
    incidentId: formData.get('incidentId') as string,
    clientId: formData.get('clientId') as string,
    category: formData.get('category') as string,
    status: formData.get('status') as string,
    occurredAt: formData.get('occurredAt') as string,
    location: (formData.get('location') as string) || undefined,
    description: formData.get('description') as string,
    immediateActions: (formData.get('immediateActions') as string) || undefined,
    guardianNotified: formData.get('guardianNotified') === 'true',
    caseManagerNotified: formData.get('caseManagerNotified') === 'true',
    dhsReported: formData.get('dhsReported') === 'true',
    dhsReportNumber: (formData.get('dhsReportNumber') as string) || undefined,
    followUpRequired: formData.get('followUpRequired') === 'true',
    followUpDueDate: (formData.get('followUpDueDate') as string) || '',
    followUpNotes: (formData.get('followUpNotes') as string) || undefined,
    staffInvolved: staffInvolvedRaw.filter(Boolean),
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('incidents')
    .update({
      client_id: parsed.data.clientId || null,
      category: parsed.data.category,
      status: parsed.data.status,
      occurred_at: new Date(parsed.data.occurredAt).toISOString(),
      location: parsed.data.location || null,
      description: parsed.data.description,
      immediate_actions: parsed.data.immediateActions || null,
      staff_involved: parsed.data.staffInvolved && parsed.data.staffInvolved.length > 0 ? parsed.data.staffInvolved : null,
      guardian_notified: parsed.data.guardianNotified,
      guardian_notified_at: parsed.data.guardianNotified ? now : null,
      case_manager_notified: parsed.data.caseManagerNotified,
      case_manager_notified_at: parsed.data.caseManagerNotified ? now : null,
      dhs_reported: parsed.data.dhsReported,
      dhs_reported_at: parsed.data.dhsReported ? now : null,
      dhs_report_number: parsed.data.dhsReportNumber || null,
      follow_up_required: parsed.data.followUpRequired,
      follow_up_due_date: parsed.data.followUpDueDate || null,
      follow_up_notes: parsed.data.followUpNotes || null,
      resolved_at: parsed.data.status === 'closed' ? now : null,
      resolved_by: parsed.data.status === 'closed' ? user.id : null,
    })
    .eq('id', parsed.data.incidentId)
    .eq('organization_id', user.organizationId)

  if (error) return { error: error.message }

  await logAuditEvent({
    user,
    action: 'incident_updated',
    entityType: 'incident',
    entityId: parsed.data.incidentId,
    details: { status: parsed.data.status, category: parsed.data.category },
  }).catch(() => null)

  revalidatePath('/incidents')
  revalidatePath(`/incidents/${parsed.data.incidentId}`)
  revalidatePath('/dashboard')
  revalidatePath('/admin/audit-assistant')
  return { error: null, success: true }
}

export async function updateIncidentStatus(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }

  const parsed = statusSchema.safeParse({
    incidentId: formData.get('incidentId') as string,
    status: formData.get('status') as string,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase
    .from('incidents')
    .update({
      status: parsed.data.status,
      resolved_at: parsed.data.status === 'closed' ? new Date().toISOString() : null,
      resolved_by: parsed.data.status === 'closed' ? user.id : null,
    })
    .eq('id', parsed.data.incidentId)
    .eq('organization_id', user.organizationId)

  if (error) return { error: error.message }

  await logAuditEvent({
    user,
    action: 'incident_updated',
    entityType: 'incident',
    entityId: parsed.data.incidentId,
    details: { status: parsed.data.status },
  }).catch(() => null)

  revalidatePath('/incidents')
  revalidatePath('/admin/audit-assistant')
  return { error: null, success: 'Incident status updated.' }
}
