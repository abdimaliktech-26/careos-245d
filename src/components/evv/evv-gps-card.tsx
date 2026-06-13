'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useGeolocation, isWithinGeofence, haversineDistance } from '@/hooks/use-geolocation'
import { useVoiceInput, speakText, type VoiceLang } from '@/hooks/use-voice-input'
import { useLiveLocationTracking } from '@/hooks/use-live-location-tracking'
import { VoiceMicButton } from '@/components/ui/voice-mic-button'
import { EvvFaceCapture } from '@/components/evv/evv-face-capture'
import { gpsCheckIn, gpsCheckOut } from '@/lib/evv/actions'
import { grantLocationConsent } from '@/lib/evv/consent'

// Leaflet is browser-only — load the per-visit map client-side.
const EvvVisitMap = dynamic(
  () => import('@/components/evv/evv-visit-map').then((m) => m.EvvVisitMap),
  { ssr: false }
)

type EvvVisit = {
  id: string
  clientName: string
  staffName: string
  serviceName: string
  serviceDate: string
  status: string
  scheduledStart?: string
  scheduledEnd?: string
  clientAddress?: string
  clientLat?: number
  clientLng?: number
  checkInLat?: number
  checkInLng?: number
  checkOutLat?: number
  checkOutLng?: number
}

const GEOFENCE_RADIUS = 100

type EvvGpsCardProps = {
  visit: EvvVisit
  locationConsented?: boolean
}

export function EvvGpsCard({ visit, locationConsented = false }: EvvGpsCardProps) {
  const router = useRouter()
  const { position, error: geoError, loading: geoLoading, requestPosition } = useGeolocation()
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [voiceLang, setVoiceLang] = useState<VoiceLang>('en')
  const [useFace, setUseFace] = useState(false)
  const [showFaceCapture, setShowFaceCapture] = useState(false)
  const [consented, setConsented] = useState(locationConsented)
  const [consentPending, setConsentPending] = useState(false)
  const [showMap, setShowMap] = useState(false)

  // Live tracking runs ONLY while the visit is active AND the caregiver has
  // consented. The hook stops watching the moment either flips false.
  const isActiveVisit = visit.status === 'in_progress'
  const liveTracking = useLiveLocationTracking(visit.id, isActiveVisit && consented)

  const handleConsent = useCallback(async () => {
    setConsentPending(true)
    const res = await grantLocationConsent()
    setConsentPending(false)
    if (!res.error) setConsented(true)
  }, [])

  const { isListening, isSupported, start, stop } = useVoiceInput({
    lang: voiceLang,
    onResult: (transcript, isFinal) => {
      if (!isFinal) return
      const t = transcript.toLowerCase()
      if (t.includes('start') || t.includes('check in') || t.includes('begin')) {
        handleCheckIn()
      } else if (t.includes('end') || t.includes('check out') || t.includes('stop') || t.includes('finish')) {
        handleCheckOut()
      }
    },
    onError: (msg) => setActionError(msg),
  })

  const isScheduled = visit.status === 'scheduled'
  const isInProgress = visit.status === 'in_progress'
  const isCompleted = visit.status === 'completed' || visit.status === 'missed' || visit.status === 'exception'

  const withinRange = position && visit.clientLat != null && visit.clientLng != null
    ? isWithinGeofence(position, { lat: visit.clientLat, lng: visit.clientLng }, GEOFENCE_RADIUS)
    : null

  const performCheckIn = useCallback(async (faceVerified: boolean) => {
    if (!position) { requestPosition(); return }
    setSubmitting(true)
    setActionMsg(null)
    setActionError(null)

    if (visit.clientLat && visit.clientLng) {
      const dist = haversineDistance(position, { lat: visit.clientLat, lng: visit.clientLng })
      if (!isWithinGeofence(position, { lat: visit.clientLat, lng: visit.clientLng }, GEOFENCE_RADIUS)) {
        setActionError(`You are ${Math.round(dist)}m from the service location. Check in anyway?`)
        setSubmitting(false)
        return
      }
    }

    const result = await gpsCheckIn(visit.id, position.lat, position.lng, position.accuracy, { faceVerified })
    if (result.error) setActionError(result.error)
    else {
      const verified = faceVerified ? ' (face verified)' : ''
      const msg = `Checked in via GPS at ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}${verified}`
      setActionMsg(msg)
      speakText(`Visit started for ${visit.clientName}. ${msg}`, voiceLang)
      router.refresh()
    }
    setSubmitting(false)
  }, [position, requestPosition, visit, router, voiceLang])

  const handleCheckIn = useCallback(async () => {
    if (!position) { requestPosition(); return }
    if (useFace) { setShowFaceCapture(true); return }
    await performCheckIn(false)
  }, [position, requestPosition, useFace, performCheckIn])

  const handleCheckOut = useCallback(async () => {
    if (!position) { requestPosition(); return }
    setSubmitting(true)
    setActionMsg(null)
    setActionError(null)

    const result = await gpsCheckOut(visit.id, position.lat, position.lng, position.accuracy)
    if (result.error) setActionError(result.error)
    else {
      const msg = `Checked out via GPS at ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
      setActionMsg(msg)
      speakText(`Visit ended for ${visit.clientName}. ${msg}`, voiceLang)
      router.refresh()
    }
    setSubmitting(false)
  }, [position, requestPosition, visit, router, voiceLang])

  const statusColors: Record<string, string> = {
    scheduled: 'border-l-gray-400',
    in_progress: 'border-l-blue-500',
    completed: 'border-l-emerald-500',
    missed: 'border-l-red-500',
    exception: 'border-l-amber-500',
  }

  return (
    <div className={`rounded-xl border border-border bg-card border-l-4 ${statusColors[visit.status] ?? 'border-l-gray-400'} p-4`} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{visit.clientName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{visit.serviceName} · {visit.serviceDate}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              {visit.status.replaceAll('_', ' ')}
            </span>
            {position && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                GPS: {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
              </span>
            )}
            {withinRange === true && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                Within geofence ✓
              </span>
            )}
            {withinRange === false && (
              <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                Outside geofence
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 shrink-0">
          {isScheduled && (
            <button
              onClick={handleCheckIn}
              disabled={submitting || geoLoading}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {geoLoading ? 'Getting GPS…' : submitting ? 'Checking in…' : 'GPS Check-in'}
            </button>
          )}
          {isInProgress && (
            <button
              onClick={handleCheckOut}
              disabled={submitting || geoLoading}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {geoLoading ? 'Getting GPS…' : submitting ? 'Checking out…' : 'GPS Check-out'}
            </button>
          )}
          {!position && !isCompleted && (
            <button
              onClick={requestPosition}
              disabled={geoLoading}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
            >
              {geoLoading ? 'Locating…' : 'Get GPS Fix'}
            </button>
          )}
        </div>
      </div>

      {/* Voice controls */}
      <div className="mt-3 flex items-center gap-2 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1.5">
          {(['en', 'so'] as VoiceLang[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setVoiceLang(l)}
              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded transition ${
                voiceLang === l ? 'text-primary bg-accent' : 'text-muted-foreground hover:text-muted-foreground'
              }`}
            >
              {l === 'en' ? 'EN' : 'SO'}
            </button>
          ))}
        </div>
        <VoiceMicButton
          isListening={isListening}
          isSupported={isSupported}
          lang={voiceLang}
          onClick={() => (isListening ? stop() : start())}
          size="sm"
          disabled={submitting || isCompleted}
        />
        <span className="text-[10px] text-muted-foreground">
          {isListening ? 'Say "Start" or "End"…' : 'Voice check-in'}
        </span>
        {isScheduled && (
          <label className="ml-auto flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
            <input
              type="checkbox"
              checked={useFace}
              onChange={(e) => setUseFace(e.target.checked)}
              disabled={submitting}
            />
            Face verify
          </label>
        )}
      </div>

      {showFaceCapture && (
        <EvvFaceCapture
          clientName={visit.clientName}
          onVerified={() => {
            setShowFaceCapture(false)
            performCheckIn(true)
          }}
          onCancel={() => setShowFaceCapture(false)}
        />
      )}

      {/* Live location tracking — active visits only */}
      {isActiveVisit && (
        <div className="mt-3 pt-3 border-t border-gray-50">
          {!consented ? (
            <div className="rounded-lg bg-blue-50 px-3 py-2">
              <p className="text-[11px] font-semibold text-blue-800">Share live location during this visit?</p>
              <p className="mt-0.5 text-[10px] text-blue-700/80 leading-snug">
                Your location is shared with your supervisor only while this visit is active. It stops automatically when you check out.
              </p>
              <button
                onClick={handleConsent}
                disabled={consentPending}
                className="mt-1.5 rounded-md bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                {consentPending ? 'Enabling…' : 'Enable live location'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[10px]">
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full rounded-full ${liveTracking.tracking ? 'animate-ping bg-emerald-400 opacity-70' : ''}`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${liveTracking.tracking ? 'bg-emerald-500' : 'bg-gray-400'}`} />
              </span>
              <span className="font-semibold text-emerald-700">
                {liveTracking.tracking ? 'Sharing live location' : 'Live location paused'}
              </span>
              {liveTracking.lastPingAt && (
                <span className="text-muted-foreground">· updated {new Date(liveTracking.lastPingAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
              )}
              {liveTracking.error && <span className="text-amber-600">· {liveTracking.error}</span>}
            </div>
          )}
        </div>
      )}

      {/* Per-visit map: exactly where check-in / check-out happened */}
      {(visit.checkInLat != null || visit.clientLat != null) && (
        <div className="mt-3">
          <button
            onClick={() => setShowMap((v) => !v)}
            className="text-[10px] font-semibold text-primary hover:underline"
          >
            {showMap ? 'Hide map' : 'Show check-in map'}
          </button>
          {showMap && (
            <div className="mt-2">
              <EvvVisitMap
                height={200}
                geofenceRadiusM={GEOFENCE_RADIUS}
                checkIn={visit.checkInLat != null && visit.checkInLng != null ? { lat: visit.checkInLat, lng: visit.checkInLng } : null}
                checkOut={visit.checkOutLat != null && visit.checkOutLng != null ? { lat: visit.checkOutLat, lng: visit.checkOutLng } : null}
                clientHome={visit.clientLat != null && visit.clientLng != null ? { lat: visit.clientLat, lng: visit.clientLng } : null}
              />
            </div>
          )}
        </div>
      )}

      {geoError && <p className="mt-2 text-xs text-red-600">{geoError}</p>}
      {actionMsg && <p className="mt-2 text-xs text-emerald-600">{actionMsg}</p>}
      {actionError && <p className="mt-2 text-xs text-amber-600">{actionError}</p>}
    </div>
  )
}
