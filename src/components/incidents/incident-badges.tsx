'use client'

import type { IncidentCategory, IncidentStatus } from '@/types/incidents'

const CATEGORY_STYLES: Record<IncidentCategory, string> = {
  injury: 'bg-rose-50 text-rose-700',
  medication_error: 'bg-amber-50 text-amber-700',
  behavioral_incident: 'bg-violet-50 text-violet-700',
  emergency_manual_restraint: 'bg-orange-50 text-orange-700',
  maltreatment_concern: 'bg-red-50 text-red-700',
  death: 'bg-gray-100 text-gray-700',
  property_damage: 'bg-blue-50 text-blue-700',
  elopement: 'bg-yellow-50 text-yellow-700',
  other: 'bg-gray-50 text-gray-600',
}

const STATUS_STYLES: Record<IncidentStatus, string> = {
  open: 'bg-blue-50 text-blue-700',
  under_review: 'bg-amber-50 text-amber-700',
  reported_to_state: 'bg-red-50 text-red-700',
  closed: 'bg-emerald-50 text-emerald-700',
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
