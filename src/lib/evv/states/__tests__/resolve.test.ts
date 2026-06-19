import { describe, test, expect } from 'vitest'
import { applyOverrides } from '../resolve'
import { getStateProfile } from '../registry'

describe('applyOverrides', () => {
  test('override geofence only', () => {
    const p = applyOverrides(getStateProfile('MN')!, { geofenceRadiusM: 250 })
    expect(p.geofenceRadiusM).toBe(250); expect(p.defaultVendor).toBe('hhaexchange')
  })
  test('no overrides returns base', () => {
    expect(applyOverrides(getStateProfile('OH')!, null).defaultVendor).toBe('sandata')
  })
})
