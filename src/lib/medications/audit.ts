import { createAdminClient } from '@/lib/supabase/admin'
import type { UserProfile } from '@/types/app'

type MedAuditInput = {
  user: UserProfile
  organizationId: string
  action: string
  clientId?: string | null
  medicationId?: string | null
  entityType?: string
  entityId?: string | null
  previousValue?: Record<string, unknown> | null
  newValue?: Record<string, unknown> | null
}

/**
 * Append a row to medication_audit_logs (dedicated before/after trail for all
 * medication-related actions). Uses the admin client so the write always
 * succeeds regardless of the caller's RLS scope. Never throws into callers.
 */
export async function logMedicationEvent(input: MedAuditInput): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('medication_audit_logs').insert({
      organization_id: input.organizationId,
      actor_id: input.user.id,
      actor_role: input.user.role,
      action: input.action,
      client_id: input.clientId ?? null,
      medication_id: input.medicationId ?? null,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      previous_value: input.previousValue ?? null,
      new_value: input.newValue ?? null,
    })
  } catch (err) {
    // Audit logging must never break the user-facing action.
    console.error('logMedicationEvent failed', err)
  }
}
