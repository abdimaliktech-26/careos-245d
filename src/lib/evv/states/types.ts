import type { CuresActElementKey } from '@/lib/evv/compliance'
import type { AggregatorVendor } from '@/lib/evv/aggregator/types'

export type EvvModel = 'open' | 'closed' | 'provider_choice'

export type StateProfile = {
  code: string
  name: string
  model: EvvModel
  defaultVendor: AggregatorVendor
  geofenceRadiusM: number
  lateCheckInGraceMin: number
  earlyCheckOutGraceMin: number
  missedVisitGraceMin: number
  impossibleTravelSpeedKmh: number
  requiredElements: CuresActElementKey[]
}

/** The six 21st Century Cures Act required elements (default required set). */
export const CURES_REQUIRED: CuresActElementKey[] = [
  'service_type', 'individual_receiving', 'date_of_service',
  'service_location', 'individual_providing', 'service_times',
]
