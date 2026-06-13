import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { computeBillableMinutes, toComplianceVisit, deriveWorkflowStage } from '@/lib/evv/compliance'

const EXPORT_LIMIT = 2000
const SUPERVISOR_ROLES = ['program_manager', 'org_admin', 'super_admin']

function csvEscape(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/**
 * CSV export of EVV visits for payroll and state aggregator submission.
 * GET /api/evv/export?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
export async function GET(req: Request) {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!SUPERVISOR_ROLES.includes(user.role)) {
    return Response.json({ error: 'Supervisor role required.' }, { status: 403 })
  }

  const url = new URL(req.url)
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/
  const startDate = url.searchParams.get('startDate') ?? ''
  const endDate = url.searchParams.get('endDate') ?? ''
  if (!dateOnly.test(startDate) || !dateOnly.test(endDate)) {
    return Response.json({ error: 'startDate and endDate (YYYY-MM-DD) are required.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: visits, error } = await supabase
    .from('evv_visits')
    .select(
      'id, client_id, staff_id, service_name, service_date, scheduled_start, scheduled_end, actual_start, actual_end, status, check_in_method, check_out_method, check_in_location, check_out_location, check_in_distance_m, check_out_distance_m, progress_note, review_status, billing_status, billable_minutes, resolved_at, clients(legal_name, medicaid_number), staff_profiles(full_name)'
    )
    .eq('organization_id', user.organizationId)
    .gte('service_date', startDate)
    .lte('service_date', endDate)
    .order('service_date', { ascending: true })
    .limit(EXPORT_LIMIT)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const header = [
    'service_date', 'client_name', 'medicaid_number', 'staff_name', 'service_name',
    'scheduled_start', 'scheduled_end', 'actual_start', 'actual_end',
    'check_in_method', 'check_out_method', 'gps_distance_in_m', 'gps_distance_out_m',
    'status', 'workflow_stage', 'review_status', 'billing_status', 'billable_minutes', 'billable_hours',
  ]

  const rows = (visits ?? []).map((row) => {
    const visit = toComplianceVisit(row as Record<string, unknown>)
    const client = row.clients as { legal_name?: string; medicaid_number?: string } | null
    const minutes = computeBillableMinutes(visit)
    return [
      visit.serviceDate,
      client?.legal_name ?? '',
      client?.medicaid_number ?? '',
      visit.staffName ?? '',
      visit.serviceName ?? '',
      visit.scheduledStart ?? '',
      visit.scheduledEnd ?? '',
      visit.actualStart ?? '',
      visit.actualEnd ?? '',
      (row.check_in_method as string) ?? '',
      (row.check_out_method as string) ?? '',
      visit.checkInDistanceM ?? '',
      visit.checkOutDistanceM ?? '',
      visit.status,
      deriveWorkflowStage(visit).label,
      visit.reviewStatus ?? 'pending',
      visit.billingStatus ?? 'not_ready',
      minutes,
      Math.round((minutes / 60) * 100) / 100,
    ].map(csvEscape).join(',')
  })

  const csv = [header.join(','), ...rows].join('\n')
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="evv-export-${startDate}-to-${endDate}.csv"`,
    },
  })
}
