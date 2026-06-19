import type { RuleParams } from '@/lib/evv/compliance'
import type { StateProfile } from './types'

export function ruleParamsFor(profile: StateProfile): RuleParams {
  return {
    geofenceRadiusM: profile.geofenceRadiusM,
    lateCheckInGraceMin: profile.lateCheckInGraceMin,
    earlyCheckOutGraceMin: profile.earlyCheckOutGraceMin,
    missedVisitGraceMin: profile.missedVisitGraceMin,
    impossibleTravelSpeedKmh: profile.impossibleTravelSpeedKmh,
    requiredElements: profile.requiredElements,
  }
}
