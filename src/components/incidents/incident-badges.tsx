'use client'

import type { IncidentCategory, IncidentStatus } from '@/types/incidents'

const CATEGORY_STYLES: Record<IncidentCategory, string> = {
  injury: 'bg-red-50 text-red-700',
  medication_error: 'bg-status-warn-bg text-status-warn',
  behavioral_incident: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  emergency_manual_restraint: 'bg-status-warn-bg text-status-warn',
  maltreatment_concern: 'bg-status-error-bg text-status-error',
  death: 'bg-muted text-foreground',
  property_damage: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  elopement: 'bg-status-warn-bg text-status-warn',
  other: 'bg-muted text-muted-foreground',
}

const STATUS_STYLES: Record<IncidentStatus, string> = {
  open: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  under_review: 'bg-status-warn-bg text-status-warn',
  reported_to_state: 'bg-status-error-bg text-status-error',
  closed: 'bg-status-ok-bg text-status-ok',
}

const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  injury: 'Injury',
  medication_error: 'Medication Error',
  behavioral_incident: 'Behavioral Incident',
  emergency_manual_restraint: 'Emergency Manual Restraint',
  maltreatment_concern: 'Maltreatment Concern',
  death: 'Death',
  property_damage: 'Property Damage',
  elopement: 'Elopement',
  other: 'Other',
}

const STATUS_LABELS: Record<IncidentStatus, string> = {
  open: 'Open',
  under_review: 'Under Review',
  reported_to_state: 'Reported to State',
  closed: 'Closed',
}

export function IncidentCategoryBadge({ category }: { category: IncidentCategory }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${CATEGORY_STYLES[category]}`}>
      {CATEGORY_LABELS[category]}
    </span>
  )
}

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}
