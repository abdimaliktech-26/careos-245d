'use client'

import { useEffect, useRef, useState } from 'react'
import type { VideoDocument } from '@/types/video-docs'
import { getVideo } from '@/lib/video-docs/actions'

type Props = {
  video: VideoDocument
  onClose: () => void
}

export function VideoPlayer({ video, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getVideo(video.id)
      .then(({ signedUrl }) => {
        setSignedUrl(signedUrl)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load video')
      })
  }, [video.id])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl mx-4">
        <div className="rounded-2xl overflow-hidden bg-black">
          <div className="flex items-center justify-between px-4 py-3 bg-foreground">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-white truncate">{video.title}</h3>
              {video.description && (
                <p className="text-xs text-muted-foreground truncate">{video.description}</p>
              )}
            </div>
            <button onClick={onClose} className="shrink-0 ml-4 p-1 rounded hover:bg-card/10 text-muted-foreground hover:text-white transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          {error ? (
            <div className="aspect-video flex items-center justify-center bg-gray-900">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              src={signedUrl ?? undefined}
              controls
              className="w-full aspect-video bg-black"
              autoPlay
              playsInline
            >
              <p className="text-sm text-muted-foreground p-4">Your browser does not support video playback.</p>
            </video>
          )}
        </div>
      </div>
    </div>
  )
}
