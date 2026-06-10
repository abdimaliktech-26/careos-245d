import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPacketCompliance } from '@/lib/packets/compliance'
import { getSubscriptionState } from '@/lib/organization/subscription'
import { validateRequiredSignatures } from '@/lib/forms/signature-validation'
import { deliverWebhook, type WebhookConfig, type WebhookType } from '@/lib/notifications/webhooks'

export type AuditSeverity = 'critical' | 'high' | 'medium' | 'low'

export type AuditFinding = {
  id: string
  severity: AuditSeverity
  category: 'documents' | 'signatures' | 'deadlines' | 'forms' | 'staff' | 'billing' | 'evv' | 'incidents'
  title: string
  summary: string
  nextAction: string
  href?: string
}

export type AuditAssistantReport = {
  generatedAt: string
  score: number
  counts: {
    critical: number
    high: number
    medium: number
    low: number
  }
  findings: AuditFinding[]
  savedReportId?: string
  notificationCount?: number
}

const EXPECTED_TEMPLATE_COUNTS: Record<string, number> = {
  intake: 14,
  '45_day_review': 4,
  semi_annual_review: 6,
  annual_review: 20,
}

const PACKET_LABELS: Record<string, string> = {
  intake: 'Intake',
  '45_day_review': '45-Day Review',
  semi_annual_review: 'Semi-Annual',
  annual_review: 'Annual',
}

const SEVERITY_SCORE: Record<AuditSeverity, number> = {
  critical: 25,
  high: 14,
  medium: 7,
  low: 3,
}

type SupabaseReader = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>

export async function getAuditAssistantReport(
  organizationId: string,
  supabaseClient?: SupabaseReader
): Promise<AuditAssistantReport> {
  const supabase = supabaseClient ?? await createClient()
  const findings: AuditFinding[] = []

  const [
    { data: organization },
    { data: templates },
    { data: packets },
    { data: packetForms },
    { data: documents },
    { data: staffProfiles },
    { data: staffTrainings },
    { data: incidents },
    { data: evvVisits },
  ] = await Promise.all([
    supabase.from('organizations').select('plan, plan_expires_at').eq('id', organizationId).single(),
    supabase.from('form_templates').select('id, packet_types, is_active').eq('is_active', true),
    supabase
      .from('packets')
      .select('id, client_id, packet_type, status, due_date, clients(legal_name, program)')
      .eq('organization_id', organizationId)
      .order('due_date', { ascending: true }),
    supabase
      .from('packet_forms')
      .select(`
        id,
        packet_id,
        status,
        template_id,
        updated_at,
        signatures(signer_role, signed_at),
        form_responses(field_key, value, value_json, updated_at),
        form_templates(
          code,
          name,
          form_fields(field_key, label, field_type, is_required)
        ),
        packets!inner(organization_id, client_id, packet_type, due_date, clients(legal_name))
      `)
      .eq('packets.organization_id', organizationId),
    supabase.from('documents').select('storage_path, created_at').eq('organization_id', organizationId),
    supabase.from('staff_profiles').select('id, full_name, email, is_active').eq('organization_id', organizationId),
    supabase
      .from('staff_trainings')
      .select('id, training_name, status, expiration_date, staff_profiles(full_name)')
      .eq('organization_id', organizationId),
    supabase
      .from('incidents')
      .select('id, incident_number, category, status, occurred_at, guardian_notified, case_manager_notified, dhs_reported, follow_up_required, follow_up_due_date, clients(legal_name)')
      .eq('organization_id', organizationId)
      .neq('status', 'closed'),
    supabase
      .from('evv_visits')
      .select('id, client_id, staff_id, service_date, service_name, status, scheduled_start, scheduled_end, actual_start, actual_end, check_in_method, check_out_method, check_in_location, check_out_location, exception_reason, clients(legal_name), staff_profiles(full_name)')
      .eq('organization_id', organizationId)
      .gte('service_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
  ])

  const subscription = getSubscriptionState(organization ?? null)
  if (!subscription.isActive) {
    findings.push({
      id: 'subscription-expired',
      severity: 'critical',
      category: 'billing',
      title: 'Subscription is expired',
      summary: 'Business admins will be blocked from adding staff or inviting team members until billing is current.',
      nextAction: 'Update the organization billing plan or expiration date.',
      href: '/admin/settings',
    })
  }

  const templateRows = (templates ?? []) as Array<{ id: string; packet_types: string[] | null }>
  for (const [packetType, expected] of Object.entries(EXPECTED_TEMPLATE_COUNTS)) {
    const actual = templateRows.filter((template) => template.packet_types?.includes(packetType)).length
    if (actual !== expected) {
      findings.push({
        id: `template-count-${packetType}`,
        severity: 'critical',
        category: 'forms',
        title: `${PACKET_LABELS[packetType]} form count is ${actual}/${expected}`,
        summary: `The system should have ${expected} active ${PACKET_LABELS[packetType]} forms for every service/program.`,
        nextAction: 'Review the form library import and active form templates.',
        href: '/form-library',
      })
    }
  }

  const today = new Date()
  const packetRows = (packets ?? []) as Array<Record<string, unknown>>
  for (const packet of packetRows) {
    const compliance = getPacketCompliance(packet.due_date as string | null, packet.status as string | null, today)
    if (!compliance.isAlert) continue
    const client = packet.clients as { legal_name: string; program: string } | null
    findings.push({
      id: `packet-${packet.id as string}`,
      severity: compliance.level === 'overdue' ? 'critical' : compliance.level === 'due_today' || compliance.level === 'due_tomorrow' ? 'high' : 'medium',
      category: 'deadlines',
      title: `${client?.legal_name ?? 'Client'} has a ${compliance.label.toLowerCase()} packet`,
      summary: `${PACKET_LABELS[packet.packet_type as string] ?? String(packet.packet_type)} for ${client?.program ?? 'program'} is due ${packet.due_date as string}.`,
      nextAction: 'Open the client record and complete the remaining packet forms.',
      href: `/clients/${packet.client_id as string}`,
    })
  }

  const documentRows = (documents ?? []) as Array<{ storage_path: string | null; created_at: string | null }>
  const documentPaths = documentRows.map((document) => String(document.storage_path ?? ''))
  const packetFormRows = (packetForms ?? []) as Array<Record<string, unknown>>
  const formsByPacket = new Map<string, Array<Record<string, unknown>>>()
  for (const form of packetFormRows) {
    const packetId = String(form.packet_id ?? '')
    formsByPacket.set(packetId, [...(formsByPacket.get(packetId) ?? []), form])
  }

  for (const packet of packetRows) {
    const packetId = packet.id as string
    const packetType = packet.packet_type as string
    const expected = EXPECTED_TEMPLATE_COUNTS[packetType]
    if (!expected) continue
    const actual = formsByPacket.get(packetId)?.length ?? 0
    if (actual !== expected) {
      const client = packet.clients as { legal_name: string; program: string } | null
      findings.push({
        id: `packet-form-count-${packetId}`,
        severity: 'critical',
        category: 'documents',
        title: `${client?.legal_name ?? 'Client'} packet has ${actual}/${expected} forms`,
        summary: `${PACKET_LABELS[packetType] ?? packetType} packets must contain the full required form set before documents can be audit-ready.`,
        nextAction: 'Rebuild or repair this packet so it includes every required form for the packet type.',
        href: `/clients/${packet.client_id as string}`,
      })
    }
  }

  for (const form of packetFormRows) {
    const signatures = (form.signatures ?? []) as Array<{ signer_role: string; signed_at?: string | null }>
    const validation = validateRequiredSignatures(signatures)
    const packet = form.packets as { client_id: string; packet_type: string; due_date: string | null; clients: { legal_name: string } | null } | null
    const template = form.form_templates as {
      code: string
      name: string
      form_fields?: Array<{ field_key: string; label: string; field_type: string; is_required: boolean }>
    } | null
    const status = String(form.status ?? '')
    const responses = (form.form_responses ?? []) as Array<{ field_key: string; value: string | null; value_json: unknown; updated_at?: string | null }>
    const responseByKey = new Map(responses.map((response) => [response.field_key, response]))
    const requiredFields = (template?.form_fields ?? []).filter((field) =>
      field.is_required && field.field_type !== 'signature' && field.field_type !== 'section_header'
    )
    const missingRequiredFields = requiredFields.filter((field) => {
      const response = responseByKey.get(field.field_key)
      if (!response) return true
      if (response.value_json !== null && response.value_json !== undefined) {
        if (Array.isArray(response.value_json)) return response.value_json.length === 0
        if (typeof response.value_json === 'object') return Object.keys(response.value_json).length === 0
        return !String(response.value_json).trim()
      }
      return !String(response.value ?? '').trim()
    })

    if ((status === 'needs_signature' || status === 'completed') && missingRequiredFields.length > 0) {
      findings.push({
        id: `required-fields-${form.id as string}`,
        severity: status === 'completed' ? 'critical' : 'high',
        category: 'documents',
        title: `${template?.code ?? 'Form'} is missing required fields`,
        summary: `${packet?.clients?.legal_name ?? 'Client'} has ${missingRequiredFields.length} unanswered required field${missingRequiredFields.length === 1 ? '' : 's'}: ${missingRequiredFields.slice(0, 4).map((field) => field.label).join(', ')}${missingRequiredFields.length > 4 ? '...' : ''}.`,
        nextAction: 'Open the form, complete all required fields, then collect signatures again if needed.',
        href: packet ? `/clients/${packet.client_id}/forms/${form.id as string}` : undefined,
      })
    }

    if ((status === 'needs_signature' || status === 'completed') && !validation.isValid) {
      findings.push({
        id: `signature-${form.id as string}`,
        severity: status === 'completed' ? 'critical' : 'high',
        category: 'signatures',
        title: `${template?.code ?? 'Form'} is missing required signatures`,
        summary: `${packet?.clients?.legal_name ?? 'Client'} cannot have a valid completed document until ${validation.missing.join(' and ')} is saved.`,
        nextAction: 'Collect the client/guardian signature and the case manager signature.',
        href: packet ? `/clients/${packet.client_id}/forms/${form.id as string}/sign?submissionId=${form.id as string}` : undefined,
      })
    }

    const document = documentRows.find((row) => String(row.storage_path ?? '').includes(`/${form.id as string}/`))
    if (status === 'completed' && validation.isValid && missingRequiredFields.length === 0 && !documentPaths.some((path) => path.includes(`/${form.id as string}/`))) {
      findings.push({
        id: `document-${form.id as string}`,
        severity: 'medium',
        category: 'documents',
        title: `${template?.code ?? 'Completed form'} has no stored document`,
        summary: `${packet?.clients?.legal_name ?? 'Client'} has a valid completed form, but no server-side branded document record was found.`,
        nextAction: 'Download the form once to generate and store the branded document.',
        href: packet ? `/clients/${packet.client_id}` : undefined,
      })
    }

    if (status === 'completed' && validation.isValid && missingRequiredFields.length === 0 && document?.created_at) {
      const latestSignatureAt = signatures
        .map((signature) => signature.signed_at ? new Date(signature.signed_at).getTime() : 0)
        .reduce((latest, time) => Math.max(latest, time), 0)
      const latestResponseAt = responses
        .map((response) => response.updated_at ? new Date(response.updated_at).getTime() : 0)
        .reduce((latest, time) => Math.max(latest, time), 0)
      const documentCreatedAt = new Date(document.created_at).getTime()
      if (documentCreatedAt < Math.max(latestSignatureAt, latestResponseAt)) {
        findings.push({
          id: `stale-document-${form.id as string}`,
          severity: 'high',
          category: 'documents',
          title: `${template?.code ?? 'Completed form'} stored document is stale`,
          summary: `${packet?.clients?.legal_name ?? 'Client'} has responses or signatures newer than the stored branded document.`,
          nextAction: 'Download the form again to regenerate the stored document with the latest audit data.',
          href: packet ? `/clients/${packet.client_id}` : undefined,
        })
      }
    }
  }

  const staffRows = (staffProfiles ?? []) as Array<{ id: string; full_name: string | null; email: string | null; is_active: boolean | null }>
  const activeStaff = staffRows.filter((staff) => staff.is_active)
  if (activeStaff.length === 0) {
    findings.push({
      id: 'no-active-staff',
      severity: 'high',
      category: 'staff',
      title: 'No active staff accounts',
      summary: 'Business admins need active staff/case manager accounts to complete forms and sign documents.',
      nextAction: 'Create at least one staff account for the organization.',
      href: '/admin/staff/new',
    })
  }

  const trainingRows = (staffTrainings ?? []) as Array<Record<string, unknown>>
  for (const training of trainingRows) {
    const status = String(training.status ?? '')
    if (!['expired', 'expiring_soon', 'not_completed'].includes(status)) continue
    const staff = training.staff_profiles as { full_name: string } | null
    findings.push({
      id: `training-${training.id as string}`,
      severity: status === 'expired' || status === 'not_completed' ? 'high' : 'medium',
      category: 'staff',
      title: `${staff?.full_name ?? 'Staff'} has a ${status.replaceAll('_', ' ')} training`,
      summary: `${String(training.training_name ?? 'Training')} is ${status.replaceAll('_', ' ')}${training.expiration_date ? ` with expiration ${training.expiration_date as string}` : ''}.`,
      nextAction: 'Update the staff training record or collect a current credential/certificate.',
      href: '/admin/trainings',
    })
  }

  const incidentRows = (incidents ?? []) as Array<Record<string, unknown>>
  for (const incident of incidentRows) {
    const client = incident.clients as { legal_name: string } | null
    const missingNotifications = [
      !incident.guardian_notified ? 'guardian notification' : null,
      !incident.case_manager_notified ? 'case manager notification' : null,
    ].filter((item): item is string => Boolean(item))

    if (missingNotifications.length > 0) {
      findings.push({
        id: `incident-notification-${incident.id as string}`,
        severity: 'high',
        category: 'incidents',
        title: `${incident.incident_number as string} is missing notifications`,
        summary: `${client?.legal_name ?? 'Client'} incident is missing ${missingNotifications.join(' and ')}.`,
        nextAction: 'Open Incidents and document required notifications or update the incident status.',
        href: '/incidents',
      })
    }

    if (incident.follow_up_required && incident.follow_up_due_date) {
      const due = new Date(`${incident.follow_up_due_date as string}T12:00:00`)
      const today = new Date(new Date().toISOString().slice(0, 10))
      if (due < today) {
        findings.push({
          id: `incident-follow-up-${incident.id as string}`,
          severity: 'critical',
          category: 'incidents',
          title: `${incident.incident_number as string} follow-up is overdue`,
          summary: `${client?.legal_name ?? 'Client'} has incident follow-up due ${incident.follow_up_due_date as string}.`,
          nextAction: 'Complete the follow-up work and close or update the incident.',
          href: '/incidents',
        })
      }
    }

    if (String(incident.category ?? '') === 'maltreatment_concern' && !incident.dhs_reported) {
      findings.push({
        id: `incident-state-report-${incident.id as string}`,
        severity: 'critical',
        category: 'incidents',
        title: `${incident.incident_number as string} may need state reporting`,
        summary: 'Maltreatment concerns should be reviewed for DHS/state reporting requirements.',
        nextAction: 'Review the incident, document reporting decisions, and mark DHS/state reporting if completed.',
        href: '/incidents',
      })
    }
  }

  const evvRows = (evvVisits ?? []) as Array<Record<string, unknown>>
  if (evvRows.length === 0) {
    findings.push({
      id: 'evv-no-recent-visits',
      severity: 'medium',
      category: 'evv',
      title: 'No EVV visits recorded in the last 30 days',
      summary: 'The system found no EVV visit records for the organization. If services require EVV, this is an audit gap.',
      nextAction: 'Import or enter EVV visit records for EVV-covered services.',
    })
  }

  for (const visit of evvRows) {
    const client = visit.clients as { legal_name: string } | null
    const staff = visit.staff_profiles as { full_name: string } | null
    const status = String(visit.status ?? '')
    const label = `${client?.legal_name ?? 'Client'} EVV visit on ${visit.service_date as string}`

    if (status === 'scheduled' && new Date(String(visit.service_date)) < new Date(new Date().toISOString().slice(0, 10))) {
      findings.push({
        id: `evv-missed-${visit.id as string}`,
        severity: 'high',
        category: 'evv',
        title: `${label} was not completed`,
        summary: `Scheduled EVV visit for ${staff?.full_name ?? 'staff'} is still scheduled after the service date.`,
        nextAction: 'Mark the visit completed, missed, or exception with supporting notes.',
      })
    }

    if (status === 'completed') {
      const missing = [
        !visit.actual_start ? 'actual start time' : null,
        !visit.actual_end ? 'actual end time' : null,
        !visit.check_in_method ? 'check-in method' : null,
        !visit.check_out_method ? 'check-out method' : null,
        !visit.check_in_location ? 'check-in location' : null,
        !visit.check_out_location ? 'check-out location' : null,
      ].filter((item): item is string => Boolean(item))

      if (missing.length > 0) {
        findings.push({
          id: `evv-missing-${visit.id as string}`,
          severity: 'critical',
          category: 'evv',
          title: `${label} is missing EVV data`,
          summary: `Completed EVV visits need complete visit evidence. Missing: ${missing.join(', ')}.`,
          nextAction: 'Update the EVV record with the missing time, method, and location details.',
        })
      }
    }

    if (status === 'exception' && !visit.exception_reason) {
      findings.push({
        id: `evv-exception-${visit.id as string}`,
        severity: 'high',
        category: 'evv',
        title: `${label} has an undocumented EVV exception`,
        summary: 'EVV exceptions need a reason so auditors can understand why the normal visit record is incomplete.',
        nextAction: 'Add an exception reason and supporting notes to the EVV visit.',
      })
    }
  }

  const counts = findings.reduce(
    (acc, finding) => ({ ...acc, [finding.severity]: acc[finding.severity] + 1 }),
    { critical: 0, high: 0, medium: 0, low: 0 }
  )
  const penalty = findings.reduce((sum, finding) => sum + SEVERITY_SCORE[finding.severity], 0)

  return {
    generatedAt: new Date().toISOString(),
    score: Math.max(0, 100 - penalty),
    counts,
    findings: findings.toSorted((a, b) => SEVERITY_SCORE[b.severity] - SEVERITY_SCORE[a.severity]).slice(0, 60),
  }
}

export async function saveAuditReport(
  organizationId: string,
  report: AuditAssistantReport,
  source: 'manual' | 'scheduled',
  generatedBy?: string | null
) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('audit_reports')
    .insert({
      organization_id: organizationId,
      source,
      generated_by: generatedBy ?? null,
      score: report.score,
      counts: report.counts,
      findings: report.findings,
    })
    .select('id')
    .single()

  if (error || !data) return null
  return data.id as string
}

export async function queueAuditNotifications(
  organizationId: string,
  report: AuditAssistantReport,
  auditReportId: string | null
) {
  const severeFindings = report.findings.filter((finding) =>
    finding.severity === 'critical' || finding.severity === 'high'
  )
  if (severeFindings.length === 0) return 0

  const admin = createAdminClient()
  const [{ data: organization }, { data: members }] = await Promise.all([
    admin.from('organizations').select('name, email, phone').eq('id', organizationId).single(),
    admin
      .from('organization_members')
      .select('email, role')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .in('role', ['org_admin', 'program_manager']),
  ])

  const emailRecipients = new Set<string>()
  if (organization?.email) emailRecipients.add(organization.email)
  for (const member of members ?? []) {
    if (member.email) emailRecipients.add(member.email)
  }

  const subject = `CareIntake audit alert: ${severeFindings.length} high-priority finding${severeFindings.length === 1 ? '' : 's'}`
  const message = [
    `${organization?.name ?? 'Your organization'} has ${report.counts.critical} critical and ${report.counts.high} high audit finding${report.counts.critical + report.counts.high === 1 ? '' : 's'}.`,
    '',
    ...severeFindings.slice(0, 8).map((finding) => `- [${finding.severity.toUpperCase()}] ${finding.title}: ${finding.nextAction}`),
  ].join('\n')

  const rows = [
    ...Array.from(emailRecipients).map((recipient) => ({
      audit_report_id: auditReportId,
      organization_id: organizationId,
      channel: 'email',
      recipient,
      subject,
      message,
      severity: report.counts.critical > 0 ? 'critical' : 'high',
      status: 'queued',
    })),
    ...(organization?.phone ? [{
      audit_report_id: auditReportId,
      organization_id: organizationId,
      channel: 'sms',
      recipient: organization.phone,
      subject: null,
      message: `CareIntake audit alert: ${report.counts.critical} critical, ${report.counts.high} high. Open AI Audit Assistant for details.`,
      severity: report.counts.critical > 0 ? 'critical' : 'high',
      status: 'queued',
    }] : []),
  ]

  if (rows.length === 0) return 0
  const { error } = await admin.from('audit_notifications').insert(rows)
  if (error) return 0
  return rows.length
}

export async function runScheduledAuditForAllOrganizations() {
  const admin = createAdminClient()
  const { data: organizations, error } = await admin
    .from('organizations')
    .select('id')
    .neq('plan', 'expired')

  if (error) throw error

  const results = []
  for (const organization of organizations ?? []) {
    const report = await getAuditAssistantReport(organization.id, admin)
    const savedReportId = await saveAuditReport(organization.id, report, 'scheduled')
    const notificationCount = savedReportId
      ? await queueAuditNotifications(organization.id, report, savedReportId)
      : 0
    await processOrgWebhooks(admin, organization.id)
    results.push({
      organizationId: organization.id,
      score: report.score,
      findings: report.findings.length,
      savedReportId,
      notificationCount,
    })
  }

  return results
}

export async function processOrgWebhooks(admin: ReturnType<typeof createAdminClient>, organizationId: string) {
  const { data: org } = await admin
    .from('organizations')
    .select('name, slack_webhook_url, teams_webhook_url')
    .eq('id', organizationId)
    .single()

  if (!org) return []

  const webhooks: WebhookConfig[] = []
  if (org.slack_webhook_url) webhooks.push({ type: 'slack', url: org.slack_webhook_url, enabled: true })
  if (org.teams_webhook_url) webhooks.push({ type: 'teams', url: org.teams_webhook_url, enabled: true })

  if (webhooks.length === 0) return []

  const { data: latestReport } = await admin
    .from('audit_reports')
    .select('counts')
    .eq('organization_id', organizationId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single()

  const counts = latestReport?.counts as { critical?: number; high?: number } | null
  if (!counts || (counts.critical ?? 0) + (counts.high ?? 0) === 0) return []

  const message = [
    `${org.name ?? 'Your organization'}: ${counts.critical ?? 0} critical, ${counts.high ?? 0} high findings.`,
    'Open CareIntake AI Audit Assistant for details.',
  ].join('\n')

  const results = []
  for (const webhook of webhooks) {
    const result = await deliverWebhook(
      organizationId,
      webhook.type as WebhookType,
      webhook.url,
      'audit.alert',
      'CareIntake Audit Alert',
      message,
      { counts }
    )
    results.push({ organizationId, webhookType: webhook.type, ...result })
  }
  return results
}

export async function processQueuedAuditNotifications(limit = 50) {
  const admin = createAdminClient()
  const { data: notifications, error } = await admin
    .from('audit_notifications')
    .select('id, channel, recipient, subject, message')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) throw error

  const results = []
  for (const notification of notifications ?? []) {
    const channel = notification.channel as 'email' | 'sms'
    const delivery = channel === 'email'
      ? await sendEmailNotification(notification.recipient, notification.subject ?? 'CareIntake audit alert', notification.message)
      : await sendSmsNotification(notification.recipient, notification.message)

    await admin
      .from('audit_notifications')
      .update({
        status: delivery.sent ? 'sent' : delivery.skipped ? 'skipped' : 'failed',
        provider: delivery.provider,
        provider_message_id: delivery.providerMessageId,
        error: delivery.error,
        sent_at: delivery.sent ? new Date().toISOString() : null,
      })
      .eq('id', notification.id)

    results.push({ id: notification.id, channel, ...delivery })
  }

  return results
}

async function sendEmailNotification(recipient: string, subject: string, message: string) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.AUDIT_EMAIL_FROM
  if (!apiKey || !from) {
    return { sent: false, skipped: true, provider: 'resend', error: 'RESEND_API_KEY or AUDIT_EMAIL_FROM is not configured' }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: recipient,
      subject,
      text: message,
    }),
  })
  const body = await response.json().catch(() => ({}))
  return response.ok
    ? { sent: true, skipped: false, provider: 'resend', providerMessageId: body.id as string | undefined, error: null }
    : { sent: false, skipped: false, provider: 'resend', error: body.message ?? `Resend error ${response.status}` }
}

async function sendSmsNotification(recipient: string, message: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM_PHONE
  if (!accountSid || !authToken || !from) {
    return { sent: false, skipped: true, provider: 'twilio', error: 'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_FROM_PHONE is not configured' }
  }

  const params = new URLSearchParams({
    From: from,
    To: recipient,
    Body: message,
  })
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })
  const body = await response.json().catch(() => ({}))
  return response.ok
    ? { sent: true, skipped: false, provider: 'twilio', providerMessageId: body.sid as string | undefined, error: null }
    : { sent: false, skipped: false, provider: 'twilio', error: body.message ?? `Twilio error ${response.status}` }
}
