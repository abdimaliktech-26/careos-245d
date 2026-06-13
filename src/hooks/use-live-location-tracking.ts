'use client'

import { useEffect, useRef, useState } from 'react'
import { haversineDistance } from '@/hooks/use-geolocation'

// Battery/privacy budget: at most one ping per interval, and only when the
// caregiver has actually moved past the threshold since the last sent ping.
const MIN_PING_INTERVAL_MS = 20_000
const MIN_MOVE_METERS = 25

type TrackingState = {
  tracking: boolean
  lastPingAt: number | null
  error: string | null
}

/**
 * Streams the caregiver's GPS to the server while a visit is active.
 *
 * Runs ONLY when `enabled` is true (caller passes `visit.status === 'in_progress'
 * && consent given`). Watching stops the moment `enabled` flips false or the
 * server reports the visit is no longer active — never tracks off-shift.
 */
export function useLiveLocationTracking(
  visitId: string,
  enabled: boolean
): TrackingState {
  // Only async callbacks below set state — never synchronously in the effect.
  const [pingAt, setPingAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [serverStopped, setServerStopped] = useState(false)

  const lastSentAt = useRef(0)
  const lastSentPoint = useRef<{ lat: number; lng: number } | null>(null)

  const supported = typeof navigator !== 'undefined' && !!navigator.geolocation
  const active = enabled && supported && !serverStopped

  useEffect(() => {
    if (!active) return

    const geo = navigator.geolocation

    async function sendPing(lat: number, lng: number, accuracy: number) {
      const now = Date.now()
      if (now - lastSentAt.current < MIN_PING_INTERVAL_MS) return

      const previous = lastSentPoint.current
      if (previous && haversineDistance({ lat, lng }, previous) < MIN_MOVE_METERS) return

      lastSentAt.current = now
      lastSentPoint.current = { lat, lng }

      try {
        const res = await fetch('/api/evv/location-ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitId, lat, lng, accuracy }),
        })
        if (res.ok) {
          setPingAt(now)
          setError(null)
          return
        }
        const data = (await res.json().catch(() => null)) as { error?: string; stop?: boolean } | null
        // Server says the visit is no longer active or we aren't allowed — stop.
        if (data?.stop) {
          setError(data.error ?? null)
          setServerStopped(true)
        }
      } catch {
        // Transient network failure — keep watching; next move retries.
      }
    }

    const watchId = geo.watchPosition(
      (pos) => void sendPing(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
      (err) =>
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied — live tracking off.'
            : 'GPS signal unavailable.'
        ),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 }
    )

    return () => geo.clearWatch(watchId)
  }, [visitId, active])

  return {
    tracking: active,
    lastPingAt: pingAt,
    error: !supported ? 'Geolocation not supported.' : error,
  }
}
