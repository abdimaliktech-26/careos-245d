import { describe, test, expect } from 'vitest'
import { getStateProfile, listStateProfiles, DEFAULT_STATE } from '../registry'

describe('state registry', () => {
  test('MN profile uses hhaexchange + 100m geofence', () => {
    const p = getStateProfile('MN')!
    expect(p.defaultVendor).toBe('hhaexchange'); expect(p.geofenceRadiusM).toBe(100)
  })
  test('OH + AZ use sandata', () => {
    expect(getStateProfile('oh')!.defaultVendor).toBe('sandata')
    expect(getStateProfile('AZ')!.defaultVendor).toBe('sandata')
  })
  test('unknown state -> null', () => { expect(getStateProfile('ZZ')).toBeNull() })
  test('null code -> null', () => { expect(getStateProfile(null)).toBeNull() })
  test('default state exists', () => { expect(getStateProfile(DEFAULT_STATE)).not.toBeNull() })
  test('lists all profiles', () => { expect(listStateProfiles().length).toBeGreaterThanOrEqual(3) })
})
