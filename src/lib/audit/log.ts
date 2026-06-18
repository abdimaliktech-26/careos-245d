import { createAdminClient } from '@/lib/supabase/admin'
import type { UserProfile } from '@/types/app'

type AuditAction =
  | 'login'
  | 'logout'
  | 'client_created'
  | 'client_updated'
  | 'client_viewed'
  | 'packet_created'
  | 'packet_updated'
  | 'form_saved'
  | 'form_submitted'
  | 'signature_completed'
  | 'pdf_downloaded'
  | 'file_uploaded'
  | 'file_viewed'
  | 'file_deleted'
  | 'staff_record_created'
  | 'staff_record_updated'
  | 'incident_submitted'
  | 'incident_updated'
  | 'invite_sent'
  | 'member_role_changed'
  | 'agent_validation_run'

type AuditLogInput = {
  user: UserProfile
  action: AuditAction
  entityType?: string
  entityId?: string
  entityLabel?: string
  details?: Record<string, unknown>
}

export async function logAuditEvent({
  user,
  action,
  entityType,
  entityId,
  entityLabel,
  details,
  organizationId: overrideOrgId,
}: AuditLogInput & { organizationId?: string }) {
  const orgId = overrideOrgId ?? user.organizationId

  const admin = createAdminClient()
  await admin.from('audit_logs').insert({
    organization_id: orgId,
    user_id: user.id,
    user_email: user.email,
    action,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    entity_label: entityLabel ?? null,
    details: details ?? null,
  })
}
