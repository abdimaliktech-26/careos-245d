/**
 * Server-safe geo math for EVV verification.
 * Mirrors the client-side helpers in @/hooks/use-geolocation, which cannot be
 * imported into server code because that module is a 'use client' boundary.
 */

export type GeoPoint = { lat: number; lng: number }

const EARTH_RADIUS_M = 6371000

export function haversineDistance(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

export function isWithinGeofence(position: GeoPoint, center: GeoPoint, radiusM: number): boolean {
  return haversineDistance(position, center) <= radiusM
}
