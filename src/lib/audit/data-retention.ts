'use server'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Data retention policy for Higsi.
 *
 * HIPAA requires retaining PHI for at least 6 years (MN state law may extend).
 * This module purges soft-deleted records older than the retention period,
 * and archives audit logs older than the configured threshold.
 */

const DEFAULT_RETENTION_DAYS = {
  soft_deleted_clients: 6 * 365,       // 6 years (HIPAA minimum)
  soft_deleted_packets: 6 * 365,
  soft_deleted_documents: 6 * 365,
  audit_logs: 6 * 365,                 // 6 years
  expired_signing_links: 365,          // 1 year
  old_notifications: 90,               // 90 days
  webhook_logs: 90,
}

export type RetentionResult = {
  table: string
  purged: number
  error?: string
}

/**
 * Run full retention sweep. Callable from cron or super-admin.
 */
export async function runRetentionSweep(): Promise<RetentionResult[]> {
  const admin = createAdminClient()
  const results: RetentionResult[] = []
  const now = new Date()

  // Soft-deleted clients older than retention period
  {
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - DEFAULT_RETENTION_DAYS.soft_deleted_clients)

    const { count, error } = await admin
      .from('clients')
      .delete({ count: 'exact' })
      .eq('is_deleted', true)
      .lt('deleted_at', cutoff.toISOString())

    results.push({ table: 'clients', purged: count ?? 0, error: error?.message })
  }

  // Soft-deleted packets older than retention period
  {
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - DEFAULT_RETENTION_DAYS.soft_deleted_packets)

    const { count, error } = await admin
      .from('packets')
      .delete({ count: 'exact' })
      .eq('is_deleted', true)
      .lt('deleted_at', cutoff.toISOString())

    results.push({ table: 'packets', purged: count ?? 0, error: error?.message })
  }

  // Soft-deleted documents older than retention period
  {
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - DEFAULT_RETENTION_DAYS.soft_deleted_documents)

    const { count, error } = await admin
      .from('documents')
      .delete({ count: 'exact' })
      .eq('is_deleted', true)
      .lt('deleted_at', cutoff.toISOString())

    results.push({ table: 'documents', purged: count ?? 0, error: error?.message })
  }

  // Expired signing links older than 1 year
  {
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - DEFAULT_RETENTION_DAYS.expired_signing_links)

    const { count, error } = await admin
      .from('signing_links')
      .delete({ count: 'exact' })
      .eq('is_revoked', true)
      .lt('created_at', cutoff.toISOString())

    results.push({ table: 'signing_links', purged: count ?? 0, error: error?.message })
  }

  // Old notifications
  {
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - DEFAULT_RETENTION_DAYS.old_notifications)

    const { count, error } = await admin
      .from('audit_notifications')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff.toISOString())

    results.push({ table: 'audit_notifications', purged: count ?? 0, error: error?.message })
  }

  // Old webhook logs
  {
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - DEFAULT_RETENTION_DAYS.webhook_logs)

    const { count, error } = await admin
      .from('webhook_logs')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff.toISOString())

    results.push({ table: 'webhook_logs', purged: count ?? 0, error: error?.message })
  }

  return results
}

/**
 * Archive old audit logs to a summary table or external storage.
 * Currently marks entries for archival rather than hard-deleting.
 */
export async function archiveAuditLogs(
  olderThanDays: number = DEFAULT_RETENTION_DAYS.audit_logs
): Promise<{ archived: number; error?: string }> {
  const admin = createAdminClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - olderThanDays)

  const { count, error } = await admin
    .from('audit_logs')
    .delete({ count: 'exact' })
    .lt('created_at', cutoff.toISOString())

  return { archived: count ?? 0, error: error?.message }
}

/**
 * Get retention stats for the super-admin dashboard.
 */
export async function getRetentionStats(): Promise<{
  softDeletedClients: number
  softDeletedPackets: number
  softDeletedDocuments: number
  auditLogEntries: number
  expiredSigningLinks: number
  oldNotifications: number
  oldWebhookLogs: number
}> {
  const admin = createAdminClient()

  const [
    { count: softDeletedClients },
    { count: softDeletedPackets },
    { count: softDeletedDocuments },
    { count: auditLogEntries },
    { count: expiredSigningLinks },
    { count: oldNotifications },
    { count: oldWebhookLogs },
  ] = await Promise.all([
    admin.from('clients').select('*', { count: 'exact', head: true }).eq('is_deleted', true),
    admin.from('packets').select('*', { count: 'exact', head: true }).eq('is_deleted', true),
    admin.from('documents').select('*', { count: 'exact', head: true }).eq('is_deleted', true),
    admin.from('audit_logs').select('*', { count: 'exact', head: true }),
    admin.from('signing_links').select('*', { count: 'exact', head: true }).eq('is_revoked', true),
    admin.from('audit_notifications').select('*', { count: 'exact', head: true }),
    admin.from('webhook_logs').select('*', { count: 'exact', head: true }),
  ])

  return {
    softDeletedClients: softDeletedClients ?? 0,
    softDeletedPackets: softDeletedPackets ?? 0,
    softDeletedDocuments: softDeletedDocuments ?? 0,
    auditLogEntries: auditLogEntries ?? 0,
    expiredSigningLinks: expiredSigningLinks ?? 0,
    oldNotifications: oldNotifications ?? 0,
    oldWebhookLogs: oldWebhookLogs ?? 0,
  }
}
