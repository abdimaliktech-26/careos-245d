import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditEvent } from '@/lib/audit/log'
import type { UserProfile } from '@/types/app'
import type { ValidationRun } from '../types'

export type RecordedRun = { id: string }

/**
 * Append-only write of a validation run + a summary audit_logs entry.
 * Throws (fail-closed) if the run insert fails — never silently skip the audit.
 */
export async function recordValidationRun(
  run: ValidationRun,
  actor: { organizationId: string; userId: string | null; user?: UserProfile },
): Promise<RecordedRun> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('agent_validation_runs')
    .insert({
      organization_id: actor.organizationId,
      subject_type: run.subjectType,
      subject_id: run.subjectId,
      client_id: run.clientId,
      trigger: run.trigger,
      verdict: run.verdict,
      checks: run.checks,
      flags: run.flags,
      program_recommendation: run.programRecommendation,
      ai_status: 'pending',
      created_by: actor.userId,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`agent_validation_runs insert failed: ${error?.message ?? 'no row'}`)
  }

  if (actor.user) {
    await logAuditEvent({
      user: actor.user,
      action: 'agent_validation_run',
      entityType: run.subjectType,
      entityId: run.subjectId,
      entityLabel: `${run.subjectType} ${run.verdict}`,
      details: { verdict: run.verdict, flagCount: run.flags.length, trigger: run.trigger, runId: data.id },
    })
  }

  return { id: data.id }
}

/** Patch the async AI columns on an existing run (admin client; bypasses RLS). */
export async function patchRunAi(
  runId: string,
  patch: { ai_summary?: string | null; ai_model?: string | null; ai_status: string; flags?: unknown; program_recommendation?: unknown },
): Promise<void> {
  const admin = createAdminClient()
  await admin.from('agent_validation_runs').update(patch).eq('id', runId)
}
