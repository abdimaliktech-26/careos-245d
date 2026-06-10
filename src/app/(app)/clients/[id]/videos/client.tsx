'use client'

import { useState, useCallback } from 'react'
import type { VideoDocument } from '@/types/video-docs'
import { VideoList } from '@/components/video-docs/video-list'
import { VideoUploadForm } from '@/components/video-docs/video-upload-form'

type Props = {
  clientId: string
  initialVideos: VideoDocument[]
}

export function VideoPageClient({ clientId, initialVideos }: Props) {
  const [videos, setVideos] = useState<VideoDocument[]>(initialVideos)
  const [showUpload, setShowUpload] = useState(false)

  const handleUploaded = useCallback(() => {
    setShowUpload(false)
    window.location.reload()
  }, [])

  const handleDeleted = useCallback((id: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== id))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{videos.length} video{videos.length !== 1 ? 's' : ''}</p>
        {!showUpload && (
          <button
            onClick={() => setShowUpload(true)}
            className="text-sm font-semibold px-4 py-2 rounded-lg text-white bg-[#E8799E] hover:bg-[#D06085] transition-colors"
          >
            Upload Video
          </button>
        )}
      </div>

      {showUpload && (
        <VideoUploadForm
          clientId={clientId}
          onUploaded={handleUploaded}
          onCancel={() => setShowUpload(false)}
        />
      )}

      <VideoList videos={videos} onDeleted={handleDeleted} />
    </div>
  )
}
