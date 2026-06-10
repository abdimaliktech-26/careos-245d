'use client'

import { useState, useCallback, useRef } from 'react'

export type GeoPosition = {
  lat: number
  lng: number
  accuracy: number
  timestamp: number
}

type GeoState = {
  position: GeoPosition | null
  error: string | null
  loading: boolean
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ position: null, error: null, loading: false })
  const watchRef = useRef<number | null>(null)

  const requestPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState({ position: null, error: 'Geolocation not supported in this browser', loading: false })
      return
    }

    setState((prev) => ({ ...prev, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          position: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, timestamp: pos.timestamp },
          error: null,
          loading: false,
        })
      },
      (err) => {
        const messages: Record<number, string> = {
          [err.PERMISSION_DENIED]: 'Location permission denied. Enable GPS in your browser settings.',
          [err.POSITION_UNAVAILABLE]: 'GPS signal unavailable. Try moving outdoors.',
          [err.TIMEOUT]: 'GPS request timed out. Try again.',
        }
        setState({ position: null, error: messages[err.code] ?? 'Unknown GPS error', loading: false })
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }, [])

  const startWatching = useCallback(
    (onPosition?: (pos: GeoPosition) => void) => {
      if (!navigator.geolocation) {
        setState({ position: null, error: 'Geolocation not supported', loading: false })
        return
      }

      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const position = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, timestamp: pos.timestamp }
          setState({ position, error: null, loading: false })
          onPosition?.(position)
        },
        (err) => {
          const messages: Record<number, string> = {
            [err.PERMISSION_DENIED]: 'Location permission denied.',
            [err.POSITION_UNAVAILABLE]: 'GPS signal unavailable.',
            [err.TIMEOUT]: 'GPS request timed out.',
          }
          setState({ position: null, error: messages[err.code] ?? 'Unknown GPS error', loading: false })
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      )
    },
    []
  )

  const stopWatching = useCallback(() => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
  }, [])

  return { ...state, requestPosition, startWatching, stopWatching }
}

const R = 6371000

function toRad(deg: number) {
  return (deg * Math.PI) / 180
}

export function haversineDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export function isWithinGeofence(a: { lat: number; lng: number }, b: { lat: number; lng: number }, radiusMeters: number) {
  return haversineDistance(a, b) <= radiusMeters
}
