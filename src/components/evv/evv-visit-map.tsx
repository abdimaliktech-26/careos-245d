'use client'

import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { pinIcon, MARKER_COLORS } from './leaflet-marker'

export type LatLng = { lat: number; lng: number }

type EvvVisitMapProps = {
  checkIn?: LatLng | null
  checkOut?: LatLng | null
  clientHome?: LatLng | null
  geofenceRadiusM?: number
  /** Optional breadcrumb trail (live pings, oldest → newest). */
  trail?: LatLng[]
  height?: number
}

const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION = '&copy; OpenStreetMap contributors'

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 16)
      return
    }
    map.fitBounds(
      points.map((p) => [p.lat, p.lng]),
      { padding: [40, 40], maxZoom: 17 }
    )
  }, [map, points])
  return null
}

/**
 * Static map of where a visit's GPS events happened: check-in, check-out, the
 * client's service address + geofence, and (optionally) the live breadcrumb
 * trail. Read-only — used on visit detail for verification and audit.
 */
export function EvvVisitMap({
  checkIn,
  checkOut,
  clientHome,
  geofenceRadiusM = 100,
  trail,
  height = 280,
}: EvvVisitMapProps) {
  const points = useMemo(
    () => [checkIn, checkOut, clientHome, ...(trail ?? [])].filter((p): p is LatLng => !!p),
    [checkIn, checkOut, clientHome, trail]
  )

  if (points.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-border bg-muted/30 text-xs text-muted-foreground"
        style={{ height }}
      >
        No GPS coordinates captured for this visit.
      </div>
    )
  }

  const center = clientHome ?? checkIn ?? points[0]

  return (
    <div className="overflow-hidden rounded-xl border border-border" style={{ height }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={16}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url={OSM_URL} attribution={OSM_ATTRIBUTION} />
        <FitBounds points={points} />

        {clientHome && (
          <>
            <Circle
              center={[clientHome.lat, clientHome.lng]}
              radius={geofenceRadiusM}
              pathOptions={{ color: MARKER_COLORS.clientHome, fillColor: MARKER_COLORS.clientHome, fillOpacity: 0.08, weight: 1.5 }}
            />
            <Marker position={[clientHome.lat, clientHome.lng]} icon={pinIcon(MARKER_COLORS.clientHome)}>
              <Popup>Service address (geofence center, {geofenceRadiusM}m)</Popup>
            </Marker>
          </>
        )}

        {checkIn && (
          <Marker position={[checkIn.lat, checkIn.lng]} icon={pinIcon(MARKER_COLORS.checkIn)}>
            <Popup>Check-in location</Popup>
          </Marker>
        )}

        {checkOut && (
          <Marker position={[checkOut.lat, checkOut.lng]} icon={pinIcon(MARKER_COLORS.checkOut)}>
            <Popup>Check-out location</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}
