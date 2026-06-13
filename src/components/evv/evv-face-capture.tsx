'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type EvvFaceCaptureProps = {
  clientName: string
  onVerified: () => void
  onCancel: () => void
}

/**
 * Optional caregiver identity check at check-in.
 *
 * Privacy by design: the photo is captured and previewed in the browser only.
 * It is NEVER uploaded or persisted — confirming records a boolean
 * `face_verified` flag against the visit, nothing more.
 */
export function EvvFaceCapture({ clientName, onVerified, onCancel }: EvvFaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [snapshot, setSnapshot] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    let cancelled = false

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera not available in this browser.')
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => null)
        }
      } catch {
        setError('Camera permission denied. Enable it or skip face verification.')
      }
    }

    startCamera()
    return () => {
      cancelled = true
      stopStream()
    }
  }, [stopStream])

  const capture = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth || 320
    canvas.height = video.videoHeight || 240
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    setSnapshot(canvas.toDataURL('image/jpeg', 0.7))
    stopStream()
  }, [stopStream])

  const retake = useCallback(() => {
    setSnapshot(null)
    setConsent(false)
    // Re-trigger the effect by reloading the camera.
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'user' }, audio: false })
        .then((stream) => {
          streamRef.current = stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            videoRef.current.play().catch(() => null)
          }
        })
        .catch(() => setError('Camera permission denied.'))
    }
  }, [])

  const confirm = useCallback(() => {
    stopStream()
    onVerified()
  }, [stopStream, onVerified])

  const cancel = useCallback(() => {
    stopStream()
    onCancel()
  }, [stopStream, onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-lg">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Identity verification
        </p>
        <h2 className="mt-1 text-base font-bold text-foreground">Verify caregiver for {clientName}</h2>

        <div className="mt-3 overflow-hidden rounded-xl bg-black aspect-[4/3]">
          {snapshot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={snapshot} alt="Captured caregiver photo preview" className="h-full w-full object-cover" />
          ) : (
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {error && <p className="mt-2 text-xs text-amber-600">{error}</p>}

        {snapshot && (
          <label className="mt-3 flex items-start gap-2 text-[12px] text-muted-foreground">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I confirm this is the caregiver delivering the service. The photo is{' '}
              <strong>not stored</strong> — only a verification flag is recorded.
            </span>
          </label>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={cancel}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/40 transition-colors"
          >
            Skip / Cancel
          </button>
          <div className="flex items-center gap-2">
            {snapshot ? (
              <>
                <button
                  type="button"
                  onClick={retake}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors"
                >
                  Retake
                </button>
                <button
                  type="button"
                  onClick={confirm}
                  disabled={!consent}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Confirm &amp; check in
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={capture}
                disabled={!!error}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Capture photo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
