'use client'

import { useState } from 'react'
import type { VideoDocument } from '@/types/video-docs'
import { VideoCard } from './video-card'
import { VideoPlayer } from './video-player'
import { deleteVideo } from '@/lib/video-docs/actions'

type Props = {
  videos: VideoDocument[]
  onDeleted: (id: string) => void
}

export function VideoList({ videos, onDeleted }: Props) {
  const [playing, setPlaying] = useState<VideoDocument | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(video: VideoDocument) {
    if (!confirm(`Delete "${video.title}"? This action cannot be undone.`)) return
    setDeleting(video.id)
    try {
      await deleteVideo(video.id)
      onDeleted(video.id)
    } catch {
      alert('Failed to delete video.')
    } finally {
      setDeleting(null)
    }
  }

  if (videos.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-1">No videos yet</h3>
        <p className="text-xs text-muted-foreground">Upload a video recording to get started.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((video) => (
          <div key={video.id} className={`relative ${deleting === video.id ? 'opacity-50 pointer-events-none' : ''}`}>
            <VideoCard
              video={video}
              onPlay={() => setPlaying(video)}
              onDelete={() => handleDelete(video)}
            />
          </div>
        ))}
      </div>

      {playing && (
        <VideoPlayer
          video={playing}
          onClose={() => setPlaying(null)}
        />
      )}
    </>
  )
}
