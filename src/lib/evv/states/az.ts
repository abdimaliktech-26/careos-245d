import type { StateProfile } from './types'
import { CURES_REQUIRED } from './types'

export const AZ: StateProfile = {
  code: 'AZ', name: 'Arizona', model: 'open', defaultVendor: 'sandata',
  geofenceRadiusM: 150, lateCheckInGraceMin: 10, earlyCheckOutGraceMin: 10,
  missedVisitGraceMin: 15, impossibleTravelSpeedKmh: 120, requiredElements: CURES_REQUIRED,
}
