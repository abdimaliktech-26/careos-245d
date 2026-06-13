import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateRequiredSignatures } from '@/lib/forms/signature-validation'
import {
  buildComplianceSummary,
  toComplianceVisit,
  type EvvException,
  type ExceptionSeverity,
} from '@/lib/evv/compliance'
import { flagMissedVisits } from '@/lib/evv/missed-visits'

export type EvvAlertType =
  | 'evv_missed_visit'
  | 'evv_geofence_violation'
  | 'evv_missing_check_out'
  | 'evv_incomplete_documentation'
  | 'evv_missing_progress_note'
  | 'evv_overlapping_visits'
  | 'evv_impossible_travel'

export type AlertType =
  | 'deadline_upcoming'
  | 'deadline_overdue'
  | 'missing_signatures'
  | 'missing_forms'
  | 'incomplete_packet'
  | EvvAlertType

export type AlertSeverity = 'critical' | 'warning' | 'info'

export type ComplianceAlert = {
  id: string
  organizationId: string
  type: AlertType
  severity: AlertSeverity
  title: string
  description: string | null
  relatedPacketId: string | null
  relatedPacketFormId: string | null
  relatedEvvVisitId: string | null
  dueDate: string | null
  daysUntilDue: number | null
  isDismissed: boolean
  createdAt: string
}

export type AlertInput = {
  type: AlertType
  severity: AlertSeverity
  title: string
  description?: string
  relatedPacketId?: string
  relatedPacketFormId?: string
  relatedEvvVisitId?: string
  dueDate?: string
  daysUntilDue?: number
}

type UpcomingDeadline = {
  packetId: string
  packetType: string
  dueDate: string
  daysRemaining: number
  clientName: string
  missingSignatures: number
  missingForms: number
}

type SupabaseReader = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>

const PACKET_LABELS: Record<string, string> = {
  intake: 'Intake',
  '45_day_review': '45-Day Review',
  semi_annual_review: 'Semi-Annual',
  annual_review: 'Annual',
}

export async function checkUpcomingDeadlines(
  organizationId: string,
  supabaseClient?: SupabaseReader
): Promise<UpcomingDeadline[]> {
  const supabase = supabaseClient ?? await createClient()

  const { data: packets } = await supabase
    .from('packets')
    .select(`
      id,
      packet_type,
      due_date,
      status,
      packet_forms(
        id,
        status,
        signatures(signer_role, signed_at)
      ),
      clients(legal_name)
    `)
    .eq('organization_id', organizationId)
    .neq('status', 'completed')
    .order('due_date', { ascending: true })

  const results: UpcomingDeadline[] = []
  const rows = (packets ?? []) as Array<Record<string, unknown>>

  for (const p of rows) {
    const client = p.clients as { legal_name: string } | null
    const forms = (p.packet_forms ?? []) as Array<Record<string, unknown>>
    const sigs = forms.flatMap((f) => (f.signatures ?? []) as Array<{ signer_role: string; signed_at?: string | null }>)
    const validation = validateRequiredSignatures(sigs)
    const missingSignatures = validation.missing.length
    const missingForms = forms.filter((f) => f.status !== 'completed').length

    const dueDate = p.due_date as string
    const daysRemaining = Math.ceil(
      (new Date(dueDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    )

    results.push({
      packetId: p.id as string,
      packetType: p.packet_type as string,
      dueDate,
      daysRemaining,
      clientName: client?.legal_name ?? 'Unknown Client',
      missingSignatures,
      missingForms,
    })
  }

  return results
}

export async function checkMissingSignatures(
  organizationId: string,
  supabaseClient?: SupabaseReader
): Promise<AlertInput[]> {
  const supabase = supabaseClient ?? await createClient()

  const { data: packetForms } = await supabase
    .from('packet_forms')
    .select(`
      id,
      packet_id,
      status,
      signatures(signer_role, signed_at),
      packets!inner(organization_id, client_id, packet_type, due_date, status, clients(legal_name))
    `)
    .eq('packets.organization_id', organizationId)
    .in('status', ['needs_signature', 'in_progress'])

  const formRows = (packetForms ?? []) as Array<Record<string, unknown>>
  const alerts: AlertInput[] = []

  for (const form of formRows) {
    const signatures = (form.signatures ?? []) as Array<{ signer_role: string; signed_at?: string | null }>
    const validation = validateRequiredSignatures(signatures)
    if (validation.isValid) continue

    const packet = form.packets as {
      client_id: string
      packet_type: string
      due_date: string | null
      status: string
      clients: { legal_name: string } | null
    } | null

    if (!packet || packet.status === 'completed') continue

    alerts.push({
      type: 'missing_signatures',
      severity: packet.status === 'needs_signature' ? 'critical' : 'warning',
      title: `${packet.clients?.legal_name ?? 'Client'} — missing signatures`,
      description: `${PACKET_LABELS[packet.packet_type] ?? packet.packet_type} form needs ${validation.missing.join(' and ')}`,
      relatedPacketId: form.packet_id as string,
      relatedPacketFormId: form.id as string,
      dueDate: packet.due_date ?? undefined,
    })
  }

  return alerts
}

export async function checkOverdueItems(
  organizationId: string,
  supabaseClient?: SupabaseReader
): Promise<AlertInput[]> {
  const supabase = supabaseClient ?? await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: packets } = await supabase
    .from('packets')
    .select('id, packet_type, due_date, status, clients(legal_name)')
    .eq('organization_id', organizationId)
    .lt('due_date', today)
    .neq('status', 'completed')
    .order('due_date', { ascending: true })

  const packetRows = (packets ?? []) as Array<Record<string, unknown>>
  const alerts: AlertInput[] = []

  for (const p of packetRows) {
    const client = p.clients as { legal_name: string } | null
    const dueDate = p.due_date as string
    const daysOverdue = Math.ceil(
      (Date.now() - new Date(dueDate).getTime()) / (24 * 60 * 60 * 1000)
    )

    alerts.push({
      type: 'deadline_overdue',
      severity: 'critical',
      title: `${client?.legal_name ?? 'Client'} — ${(PACKET_LABELS[p.packet_type as string] ?? String(p.packet_type)).toLowerCase()} is overdue`,
      description: `${PACKET_LABELS[p.packet_type as string] ?? String(p.packet_type)} for ${client?.legal_name ?? 'Unknown'} was due ${dueDate} (${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue)`,
      relatedPacketId: p.id as string,
      dueDate,
      daysUntilDue: -daysOverdue,
    })
  }

  return alerts
}

const EVV_ALERT_SELECT =
  'id, client_id, staff_id, service_name, service_date, scheduled_start, scheduled_end, actual_start, actual_end, status, check_in_location, check_out_location, check_in_distance_m, check_out_distance_m, progress_note, review_status, billing_status, billable_minutes, resolved_at, clients(legal_name), staff_profiles(full_name)'

const EVV_ALERT_TITLES: Record<string, string> = {
  missed_visit: 'Missed visit',
  geofence_violation: 'GPS geofence violation',
  missing_check_out: 'Missing check-out',
  incomplete_documentation: 'Incomplete EVV documentation',
  missing_progress_note: 'Missing progress note',
  overlapping_visits: 'Overlapping visits',
  impossible_travel: 'Impossible travel between visits',
}

// Only the genuinely actionable exceptions become alerts; medium-severity
// timing nudges (slightly late/early) stay on the EVV board, not the alert feed.
const EVV_SEVERITY_TO_ALERT: Partial<Record<ExceptionSeverity, AlertSeverity>> = {
  critical: 'critical',
  high: 'warning',
}

/** Turns unresolved EVV compliance exceptions into alert inputs. */
export async function checkEvvExceptions(
  organizationId: string,
  supabaseClient?: SupabaseReader,
  options: { now?: Date; lookbackDays?: number } = {}
): Promise<AlertInput[]> {
  const supabase = supabaseClient ?? await createClient()
  const now = options.now ?? new Date()
  const lookbackDays = options.lookbackDays ?? 30
  const startDate = new Date(now.getTime() - lookbackDays * 86400000).toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('evv_visits')
    .select(EVV_ALERT_SELECT)
    .eq('organization_id', organizationId)
    .gte('service_date', startDate)
    .limit(500)

  // New workflow columns may not exist yet — fail soft, never break the cron.
  if (error || !data) return []

  const visits = (data as Array<Record<string, unknown>>).map(toComplianceVisit)
  const { exceptions } = buildComplianceSummary(visits, { now })

  return exceptions.flatMap((exception: EvvException) => {
    const severity = EVV_SEVERITY_TO_ALERT[exception.severity]
    if (!severity) return []
    const who = [exception.clientName, exception.staffName].filter(Boolean).join(' · ')
    return [
      {
        type: `evv_${exception.type}` as AlertType,
        severity,
        title: `${EVV_ALERT_TITLES[exception.type] ?? 'EVV exception'} — ${exception.clientName ?? 'visit'}`,
        description: `${exception.message}${who ? ` (${who}, ${exception.serviceDate})` : ''}`,
        relatedEvvVisitId: exception.visitId,
      } satisfies AlertInput,
    ]
  })
}

function alertKey(input: AlertInput): string {
  return `${input.type}:${input.relatedPacketId ?? ''}:${input.relatedPacketFormId ?? ''}:${input.relatedEvvVisitId ?? ''}`
}

export async function generateComplianceAlerts(
  organizationId: string,
  supabaseClient?: SupabaseReader
): Promise<ComplianceAlert[]> {
  const supabase = supabaseClient ?? await createClient()
  const admin = createAdminClient()

  const [deadlines, signatures, overdue, evvExceptions] = await Promise.all([
    checkUpcomingDeadlines(organizationId, supabase),
    checkMissingSignatures(organizationId, supabase),
    checkOverdueItems(organizationId, supabase),
    checkEvvExceptions(organizationId, supabase),
  ])

  const alerts: AlertInput[] = [...signatures, ...overdue, ...evvExceptions]

  for (const d of deadlines) {
    if (d.daysRemaining <= 3) {
      alerts.push({
        type: 'deadline_upcoming',
        severity: 'critical',
        title: `${d.clientName} — ${(PACKET_LABELS[d.packetType] ?? d.packetType).toLowerCase()} due in ${d.daysRemaining} day${d.daysRemaining === 1 ? '' : 's'}`,
        description: `${PACKET_LABELS[d.packetType] ?? d.packetType} is due ${d.dueDate}. ${d.missingSignatures > 0 ? `${d.missingSignatures} missing signature${d.missingSignatures === 1 ? '' : 's'}. ` : ''}${d.missingForms > 0 ? `${d.missingForms} incomplete form${d.missingForms === 1 ? '' : 's'}.` : ''}`,
        relatedPacketId: d.packetId,
        dueDate: d.dueDate,
        daysUntilDue: d.daysRemaining,
      })
    } else if (d.daysRemaining <= 7) {
      alerts.push({
        type: 'deadline_upcoming',
        severity: 'warning',
        title: `${d.clientName} — ${(PACKET_LABELS[d.packetType] ?? d.packetType).toLowerCase()} due in ${d.daysRemaining} day${d.daysRemaining === 1 ? '' : 's'}`,
        description: `${PACKET_LABELS[d.packetType] ?? d.packetType} is due ${d.dueDate}. ${d.missingSignatures > 0 ? `${d.missingSignatures} missing signature${d.missingSignatures === 1 ? '' : 's'}. ` : ''}${d.missingForms > 0 ? `${d.missingForms} incomplete form${d.missingForms === 1 ? '' : 's'}.` : ''}`,
        relatedPacketId: d.packetId,
        dueDate: d.dueDate,
        daysUntilDue: d.daysRemaining,
      })
    } else if (d.daysRemaining <= 14) {
      alerts.push({
        type: 'deadline_upcoming',
        severity: 'info',
        title: `${d.clientName} — ${(PACKET_LABELS[d.packetType] ?? d.packetType).toLowerCase()} due in ${d.daysRemaining} days`,
        description: `${PACKET_LABELS[d.packetType] ?? d.packetType} for ${d.clientName} is due ${d.dueDate}.`,
        relatedPacketId: d.packetId,
        dueDate: d.dueDate,
        daysUntilDue: d.daysRemaining,
      })
    }
  }

  const deduplicated = alerts.filter(
    (a, i, arr) => arr.findIndex((b) => alertKey(b) === alertKey(a)) === i
  )

  const { data: existing } = await admin
    .from('compliance_alerts')
    .select('id, type, related_packet_id, related_packet_form_id, related_evv_visit_id, is_dismissed')
    .eq('organization_id', organizationId)

  const existingKeys = new Set(
    (existing ?? []).map(
      (e: Record<string, unknown>) => `${String(e.type)}:${String(e.related_packet_id ?? '')}:${String(e.related_packet_form_id ?? '')}:${String(e.related_evv_visit_id ?? '')}`
    )
  )

  const newAlerts = deduplicated.filter((a) => !existingKeys.has(alertKey(a)))

  if (newAlerts.length === 0) {
    const { data: allAlerts } = await admin
      .from('compliance_alerts')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(100)

    return ((allAlerts ?? []) as Array<Record<string, unknown>>).map(mapRow)
  }

  const rows = newAlerts.map((a) => ({
    organization_id: organizationId,
    type: a.type,
    severity: a.severity,
    title: a.title,
    description: a.description ?? null,
    related_packet_id: a.relatedPacketId ?? null,
    related_packet_form_id: a.relatedPacketFormId ?? null,
    related_evv_visit_id: a.relatedEvvVisitId ?? null,
    due_date: a.dueDate ?? null,
    days_until_due: a.daysUntilDue ?? null,
  }))

  const { data: inserted } = await admin
    .from('compliance_alerts')
    .insert(rows)
    .select()

  const allAlerts = [
    ...((inserted ?? []) as Array<Record<string, unknown>>),
    ...((existing ?? []) as Array<Record<string, unknown>>),
  ]

  return allAlerts.map(mapRow)
}

function mapRow(row: Record<string, unknown>): ComplianceAlert {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    type: row.type as AlertType,
    severity: row.severity as AlertSeverity,
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    relatedPacketId: row.related_packet_id ? String(row.related_packet_id) : null,
    relatedPacketFormId: row.related_packet_form_id ? String(row.related_packet_form_id) : null,
    relatedEvvVisitId: row.related_evv_visit_id ? String(row.related_evv_visit_id) : null,
    dueDate: row.due_date ? String(row.due_date) : null,
    daysUntilDue: row.days_until_due !== null && row.days_until_due !== undefined ? Number(row.days_until_due) : null,
    isDismissed: Boolean(row.is_dismissed),
    createdAt: String(row.created_at),
  }
}

export async function getAlertSummary(organizationId: string): Promise<{
  total: number
  critical: number
  warning: number
  info: number
  byType: Record<string, number>
}> {
  const supabase = await createClient()

  const { data: alerts } = await supabase
    .from('compliance_alerts')
    .select('severity, type')
    .eq('organization_id', organizationId)
    .eq('is_dismissed', false)

  const rows = (alerts ?? []) as Array<{ severity: string; type: string }>
  const summary = { total: 0, critical: 0, warning: 0, info: 0, byType: {} as Record<string, number> }

  for (const a of rows) {
    summary.total++
    if (a.severity === 'critical') summary.critical++
    else if (a.severity === 'warning') summary.warning++
    else if (a.severity === 'info') summary.info++
    summary.byType[a.type] = (summary.byType[a.type] ?? 0) + 1
  }

  return summary
}

export async function dismissAlert(alertId: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('compliance_alerts')
    .update({ is_dismissed: true, updated_at: new Date().toISOString() })
    .eq('id', alertId)

  return !error
}

export async function getActiveAlerts(
  organizationId: string,
  options?: { type?: string; severity?: string; includeDismissed?: boolean }
): Promise<ComplianceAlert[]> {
  const supabase = await createClient()

  let query = supabase
    .from('compliance_alerts')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (!options?.includeDismissed) {
    query = query.eq('is_dismissed', false)
  }
  if (options?.type) {
    query = query.eq('type', options.type)
  }
  if (options?.severity) {
    query = query.eq('severity', options.severity)
  }

  const { data } = await query.limit(100)
  return ((data ?? []) as Array<Record<string, unknown>>).map(mapRow)
}

export async function getAlertSettings(organizationId: string): Promise<{
  deadlineWarningDays: number
  remindIntervalHours: number
  criticalWebhookEnabled: boolean
  warningWebhookEnabled: boolean
}> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('compliance_alert_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .single()

  if (!data) {
    return {
      deadlineWarningDays: 14,
      remindIntervalHours: 24,
      criticalWebhookEnabled: true,
      warningWebhookEnabled: true,
    }
  }

  const row = data as Record<string, unknown>
  return {
    deadlineWarningDays: Number(row.deadline_warning_days ?? 14),
    remindIntervalHours: Number(row.remind_interval_hours ?? 24),
    criticalWebhookEnabled: Boolean(row.critical_webhook_enabled ?? true),
    warningWebhookEnabled: Boolean(row.warning_webhook_enabled ?? true),
  }
}

export async function updateAlertSettings(
  organizationId: string,
  settings: Partial<{
    deadlineWarningDays: number
    remindIntervalHours: number
    criticalWebhookEnabled: boolean
    warningWebhookEnabled: boolean
  }>
): Promise<boolean> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('compliance_alert_settings')
    .upsert(
      {
        organization_id: organizationId,
        ...settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id' }
    )

  return !error
}

export async function runComplianceAlertsForAllOrganizations() {
  const admin = createAdminClient()
  const { data: organizations } = await admin
    .from('organizations')
    .select('id, name, slack_webhook_url, teams_webhook_url')
    .neq('plan', 'expired')

  const results = []
  for (const org of organizations ?? []) {
    const orgRow = org as Record<string, unknown>
    const orgId = String(orgRow.id)
    // Persist missed visits first so they surface as alerts this run.
    await flagMissedVisits(orgId, admin).catch(() => ({ flagged: [] }))
    const alerts = await generateComplianceAlerts(orgId, admin)
    const criticalAlerts = alerts.filter((a) => a.severity === 'critical' && !a.isDismissed)
    const warningAlerts = alerts.filter((a) => a.severity === 'warning' && !a.isDismissed)

    let notificationCount = 0
    if (criticalAlerts.length > 0 || warningAlerts.length > 0) {
      notificationCount = await sendComplianceAlertNotifications(
        orgId,
        String(orgRow.name ?? 'Organization'),
        criticalAlerts.length,
        warningAlerts.length,
        admin
      )
    }

    results.push({
      organizationId: orgId,
      totalAlerts: alerts.length,
      criticalAlerts: criticalAlerts.length,
      warningAlerts: warningAlerts.length,
      notificationCount,
    })
  }

  return results
}

async function sendComplianceAlertNotifications(
  organizationId: string,
  orgName: string,
  criticalCount: number,
  warningCount: number,
  admin: ReturnType<typeof createAdminClient>
): Promise<number> {
  const { data: members } = await admin
    .from('organization_members')
    .select('email, role')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .in('role', ['org_admin', 'program_manager'])

  const recipients = new Set<string>()
  for (const m of members ?? []) {
    if ((m as Record<string, unknown>).email) recipients.add(String((m as Record<string, unknown>).email))
  }

  if (recipients.size === 0) return 0

  const message = [
    `${orgName} has ${criticalCount} critical and ${warningCount} warning compliance alert${criticalCount + warningCount === 1 ? '' : 's'}.`,
    'Open Compliance Alerts in CareIntake to review.',
  ].join('\n')

  const rows = Array.from(recipients).map((email) => ({
    organization_id: organizationId,
    channel: 'email',
    recipient: email,
    subject: `CareIntake compliance alert: ${criticalCount} critical, ${warningCount} warning`,
    message,
    severity: criticalCount > 0 ? 'critical' : 'warning',
    status: 'queued',
  }))

  const { error } = await admin.from('audit_notifications').insert(rows)
  if (error) return 0
  return rows.length
}
