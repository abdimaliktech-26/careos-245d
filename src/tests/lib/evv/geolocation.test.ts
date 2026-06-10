import { describe, it, expect } from 'vitest'
import { haversineDistance, isWithinGeofence } from '@/hooks/use-geolocation'

describe('haversineDistance', () => {
  it('returns 0 for same point', () => {
    expect(haversineDistance({ lat: 44.97, lng: -93.27 }, { lat: 44.97, lng: -93.27 })).toBeCloseTo(0, 1)
  })

  it('calculates distance between Minneapolis and Saint Paul', () => {
    const mpls = { lat: 44.9778, lng: -93.2650 }
    const stpaul = { lat: 44.9537, lng: -93.0900 }
    const dist = haversineDistance(mpls, stpaul)
    expect(dist).toBeGreaterThan(10000)
    expect(dist).toBeLessThan(20000)
  })

  it('is symmetric', () => {
    const a = haversineDistance({ lat: 44.97, lng: -93.27 }, { lat: 44.98, lng: -93.28 })
    const b = haversineDistance({ lat: 44.98, lng: -93.28 }, { lat: 44.97, lng: -93.27 })
    expect(a).toBeCloseTo(b, 5)
  })
})

describe('isWithinGeofence', () => {
  it('returns true for same point with 100m radius', () => {
    expect(isWithinGeofence({ lat: 44.97, lng: -93.27 }, { lat: 44.97, lng: -93.27 }, 100)).toBe(true)
  })

  it('returns true for close points within radius', () => {
    expect(isWithinGeofence({ lat: 44.97, lng: -93.27 }, { lat: 44.97001, lng: -93.27 }, 100)).toBe(true)
  })

  it('returns false for far points outside radius', () => {
    const mpls = { lat: 44.9778, lng: -93.2650 }
    const stpaul = { lat: 44.9537, lng: -93.0900 }
    expect(isWithinGeofence(mpls, stpaul, 100)).toBe(false)
  })
})
