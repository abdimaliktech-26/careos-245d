'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession } from '@/lib/auth/get-session'
import { logAuditEvent } from '@/lib/audit/log'
import { createClient } from '@/lib/supabase/server'
import { RESOLUTION_CODES } from '@/lib/evv/resolution-codes'
import { syncScheduledVisits } from '@/lib/evv/schedule-sync'
import { enqueueVisitTransmission } from '@/lib/evv/aggregator/queue'

/**
 * EVV workflow server actions: progress note → supervisor review →
 * billing approval, plus exception resolution.
 *
 * Every decision that affects billing or compliance is made by a human and
 * written to the audit log. AI only drafts; it never approves.
 */

type ActionState = { error: string | null; success?: string | null }

const SUPERVISOR_ROLES = ['program_manager', 'org_admin', 'super_admin']
const STAFF_ROLES = ['staff', ...SUPERVISOR_ROLES]

const REVALIDATE_PATHS = ['/evv', '/billing-readiness', '/dashboard']

function revalidateEvv() {
  for (const path of REVALIDATE_PATHS) revalidatePath(path)
}

const progressNoteSchema = z.object({
  visitId: z.string().uuid(),
  note: z.string().min(20, 'Progress note must be at least 20 characters.').max(8000),
  source: z.enum(['manual', 'voice', 'ai']),
})

export async function saveProgressNote(
  visitId: string,
  note: string,
  source: 'manual' | 'voice' | 'ai'
): Promise<ActionState> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }
  if (!STAFF_ROLES.includes(user.role)) return { error: 'Unauthorized' }

  const parsed = progressNoteSchema.safeParse({ visitId, note: note.trim(), source })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase
    .from('evv_visits')
    .update({
      progress_note: parsed.data.note,
      progress_note_source: parsed.data.source,
      // Any note edit re-opens supervisor review
      review_status: 'pending',
    })
    .eq('id', parsed.data.visitId)
    .eq('organization_id', user.organizationId)

  if (error) return { error: error.message }

  await logAuditEvent({
    user,
    action: 'packet_updated',
    entityType: 'evv_visit',
    entityLabel: 'Progress note saved',
    details: { visitId: parsed.data.visitId, source: parsed.data.source, length: parsed.data.note.length },
  }).catch(() => null)

  revalidateEvv()
  return {
    error: null,
    success: source === 'ai' ? 'AI draft saved — pending supervisor review.' : 'Progress note saved.',
  }
}

const reviewSchema = z.object({
  visitId: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  note: z.string().max(2000).optional(),
})

export async function supervisorReview(
  visitId: string,
  decision: 'approved' | 'rejected',
  note?: string
): Promise<ActionState> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }
  if (!SUPERVISOR_ROLES.includes(user.role)) return { error: 'Supervisor role required.' }

  const parsed = reviewSchema.safeParse({ visitId, decision, note })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase
    .from('evv_visits')
    .update({
      review_status: parsed.data.decision,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: parsed.data.note?.trim() || null,
      // Approval moves the visit into the billing queue
      ...(parsed.data.decision === 'approved' ? { billing_status: 'ready' } : {}),
    })
    .eq('id', parsed.data.visitId)
    .eq('organization_id', user.organizationId)

  if (error) return { error: error.message }

  await logAuditEvent({
    user,
    action: 'packet_updated',
    entityType: 'evv_visit',
    entityLabel: `Supervisor review: ${parsed.data.decision}`,
    details: { visitId: parsed.data.visitId, decision: parsed.data.decision },
  }).catch(() => null)

  revalidateEvv()
  return {
    error: null,
    success: parsed.data.decision === 'approved' ? 'Visit approved — moved to billing queue.' : 'Visit returned to staff.',
  }
}

export async function billingDecision(
  visitId: string,
  decision: 'approved' | 'rejected'
): Promise<ActionState> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }
  if (!SUPERVISOR_ROLES.includes(user.role)) return { error: 'Supervisor role required.' }
  if (!z.string().uuid().safeParse(visitId).success) return { error: 'Invalid visit.' }

  const supabase = await createClient()

  // Billing approval requires a completed, supervisor-approved visit
  const { data: visit, error: fetchError } = await supabase
    .from('evv_visits')
    .select('status, review_status, actual_start, actual_end')
    .eq('id', visitId)
    .eq('organization_id', user.organizationId)
    .single()
  if (fetchError) return { error: fetchError.message }
  if (decision === 'approved') {
    if (visit.status !== 'completed') return { error: 'Only completed visits can be billed.' }
    if (visit.review_status !== 'approved') return { error: 'Supervisor review must be approved first.' }
    if (!visit.actual_start || !visit.actual_end) return { error: 'Visit is missing verified service times.' }
  }

  const { error } = await supabase
    .from('evv_visits')
    .update({
      billing_status: decision,
      billing_approved_by: user.id,
      billing_approved_at: new Date().toISOString(),
    })
    .eq('id', visitId)
    .eq('organization_id', user.organizationId)

  if (error) return { error: error.message }

  // Billing approval is the trigger to transmit to the state EVV aggregator.
  // Idempotent + best-effort: a queueing hiccup never blocks the approval.
  if (decision === 'approved') {
    await enqueueVisitTransmission(user.organizationId, visitId, supabase).catch(() => null)
  }

  await logAuditEvent({
    user,
    action: 'packet_updated',
    entityType: 'evv_visit',
    entityLabel: `Billing ${decision}`,
    details: { visitId, decision },
  }).catch(() => null)

  revalidateEvv()
  return {
    error: null,
    success: decision === 'approved' ? 'Visit approved for billing — queued for state aggregator.' : 'Visit rejected for billing.',
  }
}

const resolveSchema = z.object({
  visitId: z.string().uuid(),
  code: z.enum(RESOLUTION_CODES.map((r) => r.code) as [string, ...string[]]),
  note: z.string().min(5, 'A short explanation is required.').max(2000),
})

export async function resolveException(
  visitId: string,
  code: string,
  note: string
): Promise<ActionState> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }
  if (!SUPERVISOR_ROLES.includes(user.role)) return { error: 'Supervisor role required.' }

  const parsed = resolveSchema.safeParse({ visitId, code, note: note.trim() })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase
    .from('evv_visits')
    .update({
      resolution_code: parsed.data.code,
      resolution_note: parsed.data.note,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.visitId)
    .eq('organization_id', user.organizationId)

  if (error) return { error: error.message }

  await logAuditEvent({
    user,
    action: 'packet_updated',
    entityType: 'evv_visit',
    entityLabel: 'EVV exception resolved',
    details: { visitId: parsed.data.visitId, code: parsed.data.code },
  }).catch(() => null)

  revalidateEvv()
  return { error: null, success: 'Exception resolved and audit-logged.' }
}

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date.')

/**
 * Generates EVV visits for any schedule in the range that doesn't have one yet,
 * so the verification pipeline starts from staffing instead of manual entry.
 */
export async function syncVisitsFromSchedule(
  startDate: string,
  endDate: string
): Promise<ActionState> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }
  if (!SUPERVISOR_ROLES.includes(user.role)) return { error: 'Supervisor role required.' }

  const range = z.object({ startDate: dateSchema, endDate: dateSchema }).safeParse({ startDate, endDate })
  if (!range.success) return { error: range.error.issues[0].message }

  const supabase = await createClient()
  const { created } = await syncScheduledVisits(user.organizationId, supabase, range.data)

  if (created > 0) {
    await logAuditEvent({
      user,
      action: 'packet_updated',
      entityType: 'evv_visit',
      entityLabel: 'Visits generated from schedule',
      details: { created, startDate, endDate },
    }).catch(() => null)
  }

  revalidateEvv()
  return {
    error: null,
    success: created === 0 ? 'All scheduled shifts already have EVV visits.' : `Created ${created} EVV visit${created === 1 ? '' : 's'} from the schedule.`,
  }
}
