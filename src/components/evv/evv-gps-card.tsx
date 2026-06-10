'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useGeolocation, isWithinGeofence, haversineDistance } from '@/hooks/use-geolocation'
import { useVoiceInput, speakText, type VoiceLang } from '@/hooks/use-voice-input'
import { VoiceMicButton } from '@/components/ui/voice-mic-button'
import { gpsCheckIn, gpsCheckOut } from '@/lib/evv/actions'

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
}

const GEOFENCE_RADIUS = 100

type EvvGpsCardProps = {
  visit: EvvVisit
}

export function EvvGpsCard({ visit }: EvvGpsCardProps) {
  const router = useRouter()
  const { position, error: geoError, loading: geoLoading, requestPosition } = useGeolocation()
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [voiceLang, setVoiceLang] = useState<VoiceLang>('en')

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

  const handleCheckIn = useCallback(async () => {
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

    const result = await gpsCheckIn(visit.id, position.lat, position.lng, position.accuracy)
    if (result.error) setActionError(result.error)
    else {
      const msg = `Checked in via GPS at ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
      setActionMsg(msg)
      speakText(`Visit started for ${visit.clientName}. ${msg}`, voiceLang)
      router.refresh()
    }
    setSubmitting(false)
  }, [position, requestPosition, visit, router, voiceLang])

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
    <div className={`rounded-xl border border-gray-100 bg-white border-l-4 ${statusColors[visit.status] ?? 'border-l-gray-400'} p-4`} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#3A2A4A]">{visit.clientName}</p>
          <p className="text-xs text-[#64748B] mt-0.5">{visit.serviceName} · {visit.serviceDate}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
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
              className="rounded-lg bg-[#E8799E] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
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
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
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
                voiceLang === l ? 'text-[#E8799E] bg-[#EEF2FF]' : 'text-[#94A3B8] hover:text-[#64748B]'
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
        <span className="text-[10px] text-[#94A3B8]">
          {isListening ? 'Say "Start" or "End"…' : 'Voice check-in'}
        </span>
      </div>

      {geoError && <p className="mt-2 text-xs text-red-600">{geoError}</p>}
      {actionMsg && <p className="mt-2 text-xs text-emerald-600">{actionMsg}</p>}
      {actionError && <p className="mt-2 text-xs text-amber-600">{actionError}</p>}
    </div>
  )
}
