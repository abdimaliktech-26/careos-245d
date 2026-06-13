import { haversineDistance } from './geo'

/**
 * EVV compliance engine.
 *
 * Pure functions that evaluate visits against the 21st Century Cures Act
 * six required data elements and Minnesota 245D documentation expectations,
 * detect exceptions, and derive each visit's position in the EVV workflow:
 * Clock In → Service Delivery → AI Progress Note → Supervisor Review →
 * EVV Verification → Billing Approval → Compliance Tracking.
 */

export type VisitLocation = {
  source?: string
  lat?: number
  lng?: number
  accuracy?: number
  label?: string
} | null

export type EvvComplianceVisit = {
  id: string
  clientId: string
  staffId: string | null
  serviceName: string | null
  serviceDate: string
  scheduledStart: string | null
  scheduledEnd: string | null
  actualStart: string | null
  actualEnd: string | null
  status: string
  checkInLocation: VisitLocation
  checkOutLocation: VisitLocation
  checkInDistanceM: number | null
  checkOutDistanceM: number | null
  progressNote: string | null
  reviewStatus: string | null
  billingStatus: string | null
  billableMinutes: number | null
  resolvedAt: string | null
  clientName?: string
  staffName?: string
}

export type CuresActElementKey =
  | 'service_type'
  | 'individual_receiving'
  | 'date_of_service'
  | 'service_location'
  | 'individual_providing'
  | 'service_times'

export const CURES_ACT_ELEMENTS: Array<{ key: CuresActElementKey; label: string }> = [
  { key: 'service_type', label: 'Type of service' },
  { key: 'individual_receiving', label: 'Individual receiving service' },
  { key: 'date_of_service', label: 'Date of service' },
  { key: 'service_location', label: 'Location of service delivery' },
  { key: 'individual_providing', label: 'Individual providing service' },
  { key: 'service_times', label: 'Time service begins and ends' },
]

export type ExceptionType =
  | 'late_check_in'
  | 'early_check_out'
  | 'missing_check_out'
  | 'missed_visit'
  | 'geofence_violation'
  | 'incomplete_documentation'
  | 'missing_progress_note'
  | 'overlapping_visits'
  | 'impossible_travel'

export type ExceptionSeverity = 'critical' | 'high' | 'medium'

export type EvvException = {
  visitId: string
  type: ExceptionType
  severity: ExceptionSeverity
  message: string
  clientName?: string
  staffName?: string
  serviceDate: string
}

export const LATE_CHECK_IN_GRACE_MINUTES = 10
export const EARLY_CHECK_OUT_GRACE_MINUTES = 10
export const MISSED_VISIT_GRACE_MINUTES = 15
export const GEOFENCE_RADIUS_M = 100
export const IMPOSSIBLE_TRAVEL_SPEED_KMH = 120

const MS_PER_MINUTE = 60000

export type WorkflowStageKey =
  | 'clock_in'
  | 'service_delivery'
  | 'progress_note'
  | 'supervisor_review'
  | 'evv_verification'
  | 'billing_approval'
  | 'compliance_tracking'

export const WORKFLOW_STAGES: Array<{ key: WorkflowStageKey; label: string }> = [
  { key: 'clock_in', label: 'Clock In' },
  { key: 'service_delivery', label: 'Service Delivery' },
  { key: 'progress_note', label: 'Progress Note' },
  { key: 'supervisor_review', label: 'Supervisor Review' },
  { key: 'evv_verification', label: 'EVV Verification' },
  { key: 'billing_approval', label: 'Billing Approval' },
  { key: 'compliance_tracking', label: 'Compliance Tracking' },
]

export type CuresActCheck = {
  captured: CuresActElementKey[]
  missing: CuresActElementKey[]
  isComplete: boolean
}

export function checkCuresActElements(visit: EvvComplianceVisit): CuresActCheck {
  const captured: CuresActElementKey[] = []
  const missing: CuresActElementKey[] = []

  const mark = (key: CuresActElementKey, isCaptured: boolean) =>
    (isCaptured ? captured : missing).push(key)

  mark('service_type', Boolean(visit.serviceName?.trim()))
  mark('individual_receiving', Boolean(visit.clientId))
  mark('date_of_service', Boolean(visit.serviceDate))
  mark('service_location', Boolean(visit.checkInLocation || visit.checkOutLocation))
  mark('individual_providing', Boolean(visit.staffId))
  mark('service_times', Boolean(visit.actualStart && visit.actualEnd))

  return { captured, missing, isComplete: missing.length === 0 }
}

function minutesBetween(earlier: string, later: string): number {
  return (new Date(later).getTime() - new Date(earlier).getTime()) / MS_PER_MINUTE
}

/**
 * A visit is "missed" when its scheduled window has fully elapsed (plus a grace
 * period) and no one ever clocked in. Derived live so the dashboard reflects
 * reality before the nightly job persists `status = 'missed'`.
 */
export function isMissedVisit(visit: EvvComplianceVisit, now: Date = new Date()): boolean {
  if (visit.actualStart) return false
  if (visit.status === 'completed' || visit.status === 'cancelled') return false
  if (visit.status === 'missed') return true
  if (!visit.scheduledEnd) return false
  return now.getTime() > new Date(visit.scheduledEnd).getTime() + MISSED_VISIT_GRACE_MINUTES * MS_PER_MINUTE
}

export function detectVisitExceptions(
  visit: EvvComplianceVisit,
  options: { now?: Date } = {}
): EvvException[] {
  if (visit.resolvedAt) return []

  const now = options.now ?? new Date()
  const exceptions: EvvException[] = []
  const base = {
    visitId: visit.id,
    clientName: visit.clientName,
    staffName: visit.staffName,
    serviceDate: visit.serviceDate,
  }

  if (visit.scheduledStart && visit.actualStart) {
    const lateBy = minutesBetween(visit.scheduledStart, visit.actualStart)
    if (lateBy > LATE_CHECK_IN_GRACE_MINUTES) {
      exceptions.push({
        ...base,
        type: 'late_check_in',
        severity: 'medium',
        message: `Check-in ${Math.round(lateBy)} min after scheduled start.`,
      })
    }
  }

  if (visit.scheduledEnd && visit.actualEnd) {
    const earlyBy = minutesBetween(visit.actualEnd, visit.scheduledEnd)
    if (earlyBy > EARLY_CHECK_OUT_GRACE_MINUTES) {
      exceptions.push({
        ...base,
        type: 'early_check_out',
        severity: 'medium',
        message: `Check-out ${Math.round(earlyBy)} min before scheduled end.`,
      })
    }
  }

  if (visit.status === 'in_progress' && !visit.actualEnd) {
    const today = now.toISOString().slice(0, 10)
    if (visit.serviceDate < today) {
      exceptions.push({
        ...base,
        type: 'missing_check_out',
        severity: 'critical',
        message: 'Visit was never checked out. Time record is incomplete and not billable.',
      })
    }
  }

  if (isMissedVisit(visit, now)) {
    exceptions.push({
      ...base,
      type: 'missed_visit',
      severity: 'critical',
      message: 'Scheduled visit had no check-in before its scheduled end. Service was not delivered or not verified — not billable.',
    })
  }

  const worstDistance = Math.max(visit.checkInDistanceM ?? 0, visit.checkOutDistanceM ?? 0)
  if (worstDistance > GEOFENCE_RADIUS_M) {
    exceptions.push({
      ...base,
      type: 'geofence_violation',
      severity: 'high',
      message: `GPS captured ${Math.round(worstDistance)}m from the client's service address (limit ${GEOFENCE_RADIUS_M}m).`,
    })
  }

  if (visit.status === 'completed') {
    const elements = checkCuresActElements(visit)
    if (!elements.isComplete) {
      const labels = CURES_ACT_ELEMENTS.filter((e) => elements.missing.includes(e.key))
        .map((e) => e.label.toLowerCase())
        .join(', ')
      exceptions.push({
        ...base,
        type: 'incomplete_documentation',
        severity: 'critical',
        message: `Missing Cures Act element(s): ${labels}.`,
      })
    }

    if (!visit.progressNote?.trim()) {
      exceptions.push({
        ...base,
        type: 'missing_progress_note',
        severity: 'high',
        message: '245D progress note has not been written for this completed visit.',
      })
    }
  }

  return exceptions
}

export type WorkflowStage = { key: WorkflowStageKey; label: string; index: number }

export function deriveWorkflowStage(visit: EvvComplianceVisit): WorkflowStage {
  const at = (index: number): WorkflowStage => ({ ...WORKFLOW_STAGES[index], index })

  if (!visit.actualStart) return at(0)
  if (!visit.actualEnd) return at(1)
  if (!visit.progressNote?.trim()) return at(2)
  if (visit.reviewStatus !== 'approved') return at(3)
  if (!checkCuresActElements(visit).isComplete || detectVisitExceptions(visit).length > 0)
    return at(4)
  if (visit.billingStatus !== 'approved') return at(5)
  return at(6)
}

export function computeBillableMinutes(visit: EvvComplianceVisit): number {
  if (visit.billableMinutes != null) return visit.billableMinutes
  if (!visit.actualStart || !visit.actualEnd) return 0
  return Math.max(0, Math.round(minutesBetween(visit.actualStart, visit.actualEnd)))
}

export type ElementCoverage = Record<CuresActElementKey, { captured: number; total: number }>

export type ComplianceSummary = {
  scheduledCount: number
  activeCount: number
  completedCount: number
  missedCount: number
  lateCheckInCount: number
  gpsExceptionCount: number
  verifiedCount: number
  complianceRate: number
  billableMinutes: number
  billableHours: number
  exceptions: EvvException[]
  elementCoverage: ElementCoverage
}

function detectOverlaps(visits: EvvComplianceVisit[]): EvvException[] {
  const exceptions: EvvException[] = []
  const byStaff = new Map<string, EvvComplianceVisit[]>()

  for (const visit of visits) {
    if (!visit.staffId || !visit.actualStart || !visit.actualEnd || visit.resolvedAt) continue
    const list = byStaff.get(visit.staffId) ?? []
    byStaff.set(visit.staffId, [...list, visit])
  }

  for (const staffVisits of byStaff.values()) {
    const sorted = staffVisits.toSorted(
      (a, b) => new Date(a.actualStart!).getTime() - new Date(b.actualStart!).getTime()
    )
    for (let i = 1; i < sorted.length; i++) {
      const previous = sorted[i - 1]
      const current = sorted[i]
      const previousEnd = new Date(previous.actualEnd!).getTime()
      const currentStart = new Date(current.actualStart!).getTime()

      if (currentStart < previousEnd) {
        exceptions.push({
          visitId: current.id,
          type: 'overlapping_visits',
          severity: 'critical',
          message: `Overlaps another visit by the same staff member on ${current.serviceDate}. Double-billing risk.`,
          clientName: current.clientName,
          staffName: current.staffName,
          serviceDate: current.serviceDate,
        })
        continue
      }

      const previousOut = previous.checkOutLocation
      const currentIn = current.checkInLocation
      if (
        previousOut?.lat != null &&
        previousOut?.lng != null &&
        currentIn?.lat != null &&
        currentIn?.lng != null
      ) {
        const gapHours = (currentStart - previousEnd) / 3600000
        if (gapHours <= 0) continue
        const distanceKm =
          haversineDistance(
            { lat: previousOut.lat, lng: previousOut.lng },
            { lat: currentIn.lat, lng: currentIn.lng }
          ) / 1000
        if (distanceKm / gapHours > IMPOSSIBLE_TRAVEL_SPEED_KMH) {
          exceptions.push({
            visitId: current.id,
            type: 'impossible_travel',
            severity: 'critical',
            message: `Would require traveling ${Math.round(distanceKm)}km in ${Math.round(gapHours * 60)} min from the previous check-out location.`,
            clientName: current.clientName,
            staffName: current.staffName,
            serviceDate: current.serviceDate,
          })
        }
      }
    }
  }

  return exceptions
}

export function buildComplianceSummary(
  visits: EvvComplianceVisit[],
  options: { now?: Date } = {}
): ComplianceSummary {
  const completed = visits.filter((v) => v.status === 'completed')
  const perVisitExceptions = visits.flatMap((v) => detectVisitExceptions(v, options))
  const exceptions = [...perVisitExceptions, ...detectOverlaps(visits)]

  const exceptionVisitIds = new Set(
    exceptions.filter((e) => e.severity === 'critical' || e.severity === 'high').map((e) => e.visitId)
  )
  const verifiedCount = completed.filter(
    (v) => checkCuresActElements(v).isComplete && !exceptionVisitIds.has(v.id)
  ).length

  const elementCoverage = Object.fromEntries(
    CURES_ACT_ELEMENTS.map((element) => [element.key, { captured: 0, total: completed.length }])
  ) as ElementCoverage
  for (const visit of completed) {
    for (const key of checkCuresActElements(visit).captured) {
      elementCoverage[key] = {
        ...elementCoverage[key],
        captured: elementCoverage[key].captured + 1,
      }
    }
  }

  const billableMinutes = completed.reduce((sum, v) => sum + computeBillableMinutes(v), 0)

  // Missed = persisted status OR live-derived (window elapsed, no check-in).
  const missedIds = new Set(exceptions.filter((e) => e.type === 'missed_visit').map((e) => e.visitId))

  return {
    scheduledCount: visits.filter((v) => v.status === 'scheduled' && !missedIds.has(v.id)).length,
    activeCount: visits.filter((v) => v.status === 'in_progress').length,
    completedCount: completed.length,
    missedCount: missedIds.size,
    lateCheckInCount: exceptions.filter((e) => e.type === 'late_check_in').length,
    gpsExceptionCount: exceptions.filter((e) => e.type === 'geofence_violation').length,
    verifiedCount,
    complianceRate:
      completed.length === 0 ? 100 : Math.round((verifiedCount / completed.length) * 100),
    billableMinutes,
    billableHours: Math.round((billableMinutes / 60) * 10) / 10,
    exceptions,
    elementCoverage,
  }
}

/** Maps a raw evv_visits row (snake_case, joined names) to the engine's shape. */
export function toComplianceVisit(row: Record<string, unknown>): EvvComplianceVisit {
  const client = row.clients as { legal_name?: string } | null
  const staff = row.staff_profiles as { full_name?: string } | null
  return {
    id: String(row.id),
    clientId: String(row.client_id ?? ''),
    staffId: (row.staff_id as string | null) ?? null,
    serviceName: (row.service_name as string | null) ?? null,
    serviceDate: String(row.service_date ?? ''),
    scheduledStart: (row.scheduled_start as string | null) ?? null,
    scheduledEnd: (row.scheduled_end as string | null) ?? null,
    actualStart: (row.actual_start as string | null) ?? null,
    actualEnd: (row.actual_end as string | null) ?? null,
    status: String(row.status ?? 'scheduled'),
    checkInLocation: (row.check_in_location as VisitLocation) ?? null,
    checkOutLocation: (row.check_out_location as VisitLocation) ?? null,
    checkInDistanceM: (row.check_in_distance_m as number | null) ?? null,
    checkOutDistanceM: (row.check_out_distance_m as number | null) ?? null,
    progressNote: (row.progress_note as string | null) ?? null,
    reviewStatus: (row.review_status as string | null) ?? null,
    billingStatus: (row.billing_status as string | null) ?? null,
    billableMinutes: (row.billable_minutes as number | null) ?? null,
    resolvedAt: (row.resolved_at as string | null) ?? null,
    clientName: client?.legal_name,
    staffName: staff?.full_name,
  }
}
