import type { StateProfile } from './types'
import { CURES_REQUIRED } from './types'

export const MN: StateProfile = {
  code: 'MN', name: 'Minnesota', model: 'open', defaultVendor: 'hhaexchange',
  geofenceRadiusM: 100, lateCheckInGraceMin: 10, earlyCheckOutGraceMin: 10,
  missedVisitGraceMin: 15, impossibleTravelSpeedKmh: 120, requiredElements: CURES_REQUIRED,
}
