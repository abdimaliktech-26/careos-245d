import { redirect } from 'next/navigation'
import { Download, Settings } from 'lucide-react'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { checkUpcomingDeadlines } from '@/lib/audit/compliance-alerts'
import {
  buildComplianceSummary,
  deriveWorkflowStage,
  detectVisitExceptions,
  checkCuresActElements,
  computeBillableMinutes,
  toComplianceVisit,
} from '@/lib/evv/compliance'
import { EvvVisitForm } from '@/components/evv/evv-visit-form'
import { EvvGpsCard } from '@/components/evv/evv-gps-card'
import { EvvStatsGrid } from '@/components/evv/evv-stats-grid'
import { EvvExceptionsPanel } from '@/components/evv/evv-exceptions-panel'
import { EvvAiInsightsCard } from '@/components/evv/evv-ai-insights-card'
import { EvvVisitsTable } from '@/components/evv/evv-visits-table'
import { EvvSyncButton } from '@/components/evv/evv-sync-button'
import {
  EvvTransmissionPanel,
  type TransmissionRowView,
  type TransmissionSummaryView,
} from '@/components/evv/evv-transmission-panel'
import type { EvvTableVisit } from '@/components/evv/evv-visit-types'
import { EvvPageClient } from './evv-page-client'

const ADMIN_ROLES = ['org_admin', 'super_admin']

const SUPERVISOR_ROLES = ['program_manager', 'org_admin', 'super_admin']

const FULL_SELECT =
  'id, client_id, staff_id, service_name, service_date, scheduled_start, scheduled_end, actual_start, actual_end, status, exception_reason, check_in_method, check_out_method, check_in_location, check_out_location, check_in_distance_m, check_out_distance_m, progress_note, progress_note_source, review_status, billing_status, billable_minutes, resolved_at, clients(legal_name, geo_lat, geo_lng), staff_profiles(full_name)'

const LEGACY_SELECT =
  'id, client_id, staff_id, service_name, service_date, scheduled_start, scheduled_end, actual_start, actual_end, status, exception_reason, check_in_method, check_out_method, check_in_location, check_out_location, clients(legal_name), staff_profiles(full_name)'

export default async function EvvPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>
}) {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')
  if (!user.organizationId) redirect('/dashboard')

  const params = await searchParams
  const today = new Date().toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const startDate = params.startDate ?? thirtyDaysAgo
  const endDate = params.endDate ?? today

  const supabase = await createClient()

  const visitsQuery = (select: string) =>
    supabase
      .from('evv_visits')
      .select(select)
      .eq('organization_id', user.organizationId!)
      .gte('service_date', startDate)
      .lte('service_date', endDate)
      .order('service_date', { ascending: false })
      .limit(200)

  const [fullResult, { data: clients }, { data: staff }, { data: schedules }, deadlines] =
    await Promise.all([
      visitsQuery(FULL_SELECT),
      supabase
        .from('clients')
        .select('id, legal_name')
        .eq('organization_id', user.organizationId)
        .eq('status', 'active')
        .order('legal_name'),
      supabase
        .from('staff_profiles')
        .select('id, full_name')
        .eq('organization_id', user.organizationId)
        .eq('is_active', true)
        .order('full_name'),
      supabase
        .from('schedules')
        .select('id, client_id, scheduled_date')
        .eq('organization_id', user.organizationId)
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate),
      checkUpcomingDeadlines(user.organizationId).catch(() => []),
    ])

  // New workflow columns may not exist yet — fall back to the legacy shape
  let rows = fullResult.data as Array<Record<string, unknown>> | null
  let migrationNeeded = false
  let tableMissing = false
  if (fullResult.error) {
    const legacyResult = await visitsQuery(LEGACY_SELECT)
    if (legacyResult.error) {
      tableMissing = true
      rows = []
    } else {
      migrationNeeded = true
      rows = legacyResult.data as unknown as Array<Record<string, unknown>> | null
    }
  }

  const complianceVisits = (rows ?? []).map(toComplianceVisit)
  const summary = buildComplianceSummary(complianceVisits)
  const exceptionsByVisit = new Map<string, number>()
  for (const exception of summary.exceptions) {
    exceptionsByVisit.set(exception.visitId, (exceptionsByVisit.get(exception.visitId) ?? 0) + 1)
  }

  const scheduleByClientDate = new Map<string, string>()
  for (const schedule of schedules ?? []) {
    scheduleByClientDate.set(`${schedule.client_id}|${schedule.scheduled_date}`, schedule.id as string)
  }

  const tableVisits: EvvTableVisit[] = complianceVisits.map((visit) => {
    const stage = deriveWorkflowStage(visit)
    const raw = (rows ?? []).find((r) => r.id === visit.id)
    return {
      id: visit.id,
      serviceDate: visit.serviceDate,
      clientName: visit.clientName ?? '—',
      staffName: visit.staffName ?? '—',
      serviceName: visit.serviceName,
      scheduledStart: visit.scheduledStart,
      scheduledEnd: visit.scheduledEnd,
      actualStart: visit.actualStart,
      actualEnd: visit.actualEnd,
      status: visit.status,
      stageIndex: stage.index,
      stageLabel: stage.label,
      curesComplete: checkCuresActElements(visit).isComplete,
      exceptionCount: exceptionsByVisit.get(visit.id) ?? detectVisitExceptions(visit).length,
      billableMinutes: computeBillableMinutes(visit),
      progressNote: visit.progressNote,
      progressNoteSource: (raw?.progress_note_source as string | null) ?? null,
      reviewStatus: visit.reviewStatus,
      billingStatus: visit.billingStatus,
      linkedScheduleId: scheduleByClientDate.get(`${visit.clientId}|${visit.serviceDate}`) ?? null,
    }
  })

  const canSupervise = SUPERVISOR_ROLES.includes(user.role)
  const isAdmin = ADMIN_ROLES.includes(user.role)
  const upcomingReviews = (deadlines ?? []).slice(0, 5)

  // Aggregator transmission status (tolerant of the migration not being applied yet).
  const txSummary: TransmissionSummaryView = { queued: 0, sending: 0, accepted: 0, rejected: 0, failed: 0 }
  const txRows: TransmissionRowView[] = []
  const { data: txData } = await supabase
    .from('evv_aggregator_transmissions')
    .select('visit_id, status, last_error, external_id, evv_visits(service_date, clients(legal_name))')
    .eq('organization_id', user.organizationId)
    .order('updated_at', { ascending: false })
    .limit(100)
  for (const tx of (txData ?? []) as Array<Record<string, unknown>>) {
    const status = String(tx.status) as TransmissionRowView['status']
    if (status in txSummary) txSummary[status as keyof TransmissionSummaryView]++
    const visit = tx.evv_visits as { service_date?: string; clients?: { legal_name?: string } } | null
    txRows.push({
      visitId: String(tx.visit_id),
      clientName: visit?.clients?.legal_name ?? '—',
      serviceDate: visit?.service_date ?? '',
      status,
      lastError: (tx.last_error as string | null) ?? null,
      externalId: (tx.external_id as string | null) ?? null,
    })
  }
  const hasTransmissions = txRows.length > 0

  const gpsVisits = (rows ?? [])
    .filter((row) => row.status === 'scheduled' || row.status === 'in_progress')
    .slice(0, 6)

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Electronic Visit Verification · 245D Compliance
          </p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">EVV Command Center</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Clock-in to billing in one verified pipeline — GPS evidence, AI-drafted notes with human review,
            supervisor approval, and Medicaid billing readiness.
          </p>
        </div>
        {canSupervise && (
          <div className="flex flex-wrap items-start gap-2">
            {!migrationNeeded && !tableMissing && (
              <EvvSyncButton startDate={startDate} endDate={endDate} />
            )}
            <a
              href={`/api/evv/export?startDate=${startDate}&endDate=${endDate}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export payroll / billing CSV
            </a>
            {isAdmin && (
              <a
                href="/evv/settings"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                <Settings className="h-3.5 w-3.5" />
                Aggregator
              </a>
            )}
          </div>
        )}
      </div>

      {(migrationNeeded || tableMissing) && (
        <div className="mb-6 rounded-2xl border border-amber-100 bg-status-warn-bg p-4">
          <p className="text-[13px] font-semibold text-status-warn">
            {tableMissing ? 'EVV table not active yet' : 'EVV workflow upgrade pending'}
          </p>
          <p className="mt-1 text-[12px] text-status-warn leading-relaxed">
            Apply migration{' '}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[11px]">
              {tableMissing ? '202606070005_audit_automation_evv.sql' : '202606120001_evv_compliance_core.sql'}
            </code>{' '}
            in the Supabase SQL Editor to enable{' '}
            {tableMissing ? 'EVV visit tracking' : 'progress notes, supervisor review, billing approval, and GPS verification'}.
          </p>
        </div>
      )}

      <EvvStatsGrid summary={summary} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <EvvPageClient startDate={startDate} endDate={endDate} />
      </div>

      <EvvAiInsightsCard />

      <EvvExceptionsPanel exceptions={summary.exceptions} canResolve={canSupervise && !migrationNeeded} />

      {hasTransmissions && (
        <EvvTransmissionPanel summary={txSummary} rows={txRows} canRequeue={canSupervise} />
      )}

      {upcomingReviews.length > 0 && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Upcoming Review Deadlines
          </p>
          <ul className="mt-2 space-y-1.5">
            {upcomingReviews.map((deadline) => (
              <li key={deadline.packetId} className="flex flex-wrap items-center gap-2 text-[12px]">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    deadline.daysRemaining <= 7 ? 'bg-status-error-bg text-status-error' : 'bg-status-warn-bg text-status-warn'
                  }`}
                >
                  {deadline.daysRemaining}d
                </span>
                <span className="font-semibold text-foreground">{deadline.clientName}</span>
                <span className="text-muted-foreground">
                  {deadline.packetType.replaceAll('_', ' ')} due {deadline.dueDate}
                </span>
                <a href={`/packets/${deadline.packetId}`} className="text-[11px] font-semibold text-primary hover:underline">
                  Open packet
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {gpsVisits.length > 0 && (
        <div className="mb-6 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">GPS Check-in/out</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {gpsVisits.map((row) => {
              const client = row.clients as { legal_name?: string; geo_lat?: number | null; geo_lng?: number | null } | null
              const staffProfile = row.staff_profiles as { full_name?: string } | null
              return (
                <EvvGpsCard
                  key={row.id as string}
                  visit={{
                    id: row.id as string,
                    clientName: client?.legal_name ?? '—',
                    staffName: staffProfile?.full_name ?? '—',
                    serviceName: (row.service_name as string) ?? '',
                    serviceDate: row.service_date as string,
                    status: row.status as string,
                    clientLat: client?.geo_lat ?? undefined,
                    clientLng: client?.geo_lng ?? undefined,
                  }}
                />
              )
            })}
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div
          className="overflow-hidden rounded-2xl border border-border bg-card"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          <EvvVisitsTable visits={tableVisits} canSupervise={canSupervise && !migrationNeeded} />
        </div>

        <EvvVisitForm
          clients={(clients ?? []) as Array<{ id: string; legal_name: string }>}
          staff={(staff ?? []) as Array<{ id: string; full_name: string }>}
        />
      </div>
    </div>
  )
}
