import type { StateProfile } from './types'
import { CURES_REQUIRED } from './types'

export const OH: StateProfile = {
  code: 'OH', name: 'Ohio', model: 'open', defaultVendor: 'sandata',
  geofenceRadiusM: 100, lateCheckInGraceMin: 7, earlyCheckOutGraceMin: 7,
  missedVisitGraceMin: 15, impossibleTravelSpeedKmh: 120, requiredElements: CURES_REQUIRED,
}
