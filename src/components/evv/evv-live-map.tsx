'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { haversineDistance } from '@/hooks/use-geolocation'
import { subscribeToTable } from '@/lib/realtime'
import { pinIcon, MARKER_COLORS } from './leaflet-marker'

type LatLng = { lat: number; lng: number }

export type LiveVisit = {
  visitId: string
  clientName: string
  staffName: string
  clientHome: LatLng | null
  geofenceRadiusM: number
  latest: (LatLng & { recordedAt: string }) | null
}

type PingRow = {
  visit_id?: string
  lat?: number
  lng?: number
  recorded_at?: string
  organization_id?: string
}

const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION = '&copy; OpenStreetMap contributors'
const MN_CENTER: LatLng = { lat: 44.9778, lng: -93.265 } // Minneapolis fallback

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14)
      return
    }
    map.fitBounds(points.map((p) => [p.lat, p.lng]), { padding: [50, 50], maxZoom: 16 })
  }, [map, points])
  return null
}

function withinGeofence(point: LatLng, home: LatLng | null, radiusM: number): boolean {
  if (!home) return true
  return haversineDistance(point, home) <= radiusM
}

function sinceLabel(iso: string): string {
  const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (secs < 60) return `${secs}s ago`
  const mins = Math.round(secs / 60)
  return mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`
}

/**
 * Live map of caregivers on active visits. Seeds from server-loaded latest
 * positions, then updates in real time as new pings arrive. Each marker is
 * colored by whether the caregiver is inside the client's geofence.
 */
export function EvvLiveMap({
  orgId,
  initialVisits,
  height = 540,
}: {
  orgId: string
  initialVisits: LiveVisit[]
  height?: number
}) {
  const [positions, setPositions] = useState<Record<string, LatLng & { recordedAt: string }>>(() =>
    Object.fromEntries(
      initialVisits.filter((v) => v.latest).map((v) => [v.visitId, v.latest!])
    )
  )

  useEffect(() => {
    const unsub = subscribeToTable(
      'evv_location_pings',
      'INSERT',
      `organization_id=eq.${orgId}`,
      (payload) => {
        const row = payload.new as PingRow
        if (!row?.visit_id || row.lat == null || row.lng == null) return
        setPositions((prev) => ({
          ...prev,
          [row.visit_id!]: { lat: row.lat!, lng: row.lng!, recordedAt: row.recorded_at ?? new Date().toISOString() },
        }))
      }
    )
    return unsub
  }, [orgId])

  const anchors = useMemo(() => {
    const pts: LatLng[] = []
    for (const v of initialVisits) {
      const live = positions[v.visitId]
      if (live) pts.push(live)
      else if (v.clientHome) pts.push(v.clientHome)
    }
    return pts.length > 0 ? pts : [MN_CENTER]
  }, [initialVisits, positions])

  const liveCount = Object.keys(positions).length

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <span className="font-semibold text-foreground">{liveCount}</span> caregiver{liveCount === 1 ? '' : 's'} sharing live location ·{' '}
        {initialVisits.length} active visit{initialVisits.length === 1 ? '' : 's'}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border" style={{ height }}>
        <MapContainer center={[anchors[0].lat, anchors[0].lng]} zoom={13} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          <TileLayer url={OSM_URL} attribution={OSM_ATTRIBUTION} />
          <FitBounds points={anchors} />

          {initialVisits.map((v) => {
            const live = positions[v.visitId]
            return (
              <Fragment key={v.visitId}>
                {v.clientHome && (
                  <Circle
                    center={[v.clientHome.lat, v.clientHome.lng]}
                    radius={v.geofenceRadiusM}
                    pathOptions={{ color: MARKER_COLORS.clientHome, fillColor: MARKER_COLORS.clientHome, fillOpacity: 0.06, weight: 1.25 }}
                  />
                )}
                {live && (
                  <Marker
                    position={[live.lat, live.lng]}
                    icon={pinIcon(
                      withinGeofence(live, v.clientHome, v.geofenceRadiusM) ? MARKER_COLORS.liveOk : MARKER_COLORS.liveOut,
                      true
                    )}
                  >
                    <Popup>
                      <strong>{v.staffName}</strong>
                      <br />
                      Visiting {v.clientName}
                      <br />
                      {withinGeofence(live, v.clientHome, v.geofenceRadiusM) ? 'Within geofence' : 'Outside geofence'} · {sinceLabel(live.recordedAt)}
                    </Popup>
                  </Marker>
                )}
              </Fragment>
            )
          })}
        </MapContainer>
      </div>
    </div>
  )
}
