'use client'

import { useState, useRef } from 'react'
import { VIDEO_CATEGORIES, type VideoCategory } from '@/types/video-docs'
import { uploadVideo } from '@/lib/video-docs/actions'

type Props = {
  clientId: string
  onUploaded: () => void
  onCancel: () => void
}

export function VideoUploadForm({ clientId, onUploaded, onCancel }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<VideoCategory>('service_delivery')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleFile(e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) {
    const f = 'dataTransfer' in e
      ? e.dataTransfer.files[0]
      : (e.target as HTMLInputElement).files?.[0]
    if (!f) return

    if (!f.type.startsWith('video/')) {
      setError('Please select a video file.')
      return
    }
    if (f.size > 200 * 1024 * 1024) {
      setError('File too large. Maximum size is 200 MB.')
      return
    }

    setFile(f)
    setError(null)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !title.trim()) return

    setUploading(true)
    setProgress(0)
    setError(null)

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 10, 90))
    }, 500)

    try {
      await uploadVideo(file, {
        clientId,
        title: title.trim(),
        description: description.trim() || undefined,
        category,
      })
      clearInterval(interval)
      setProgress(100)
      setTimeout(onUploaded, 500)
    } catch (err) {
      clearInterval(interval)
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-[#3A2A4A]">Upload Video</h2>
        <button onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!file ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); handleFile(e) }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-[#E8799E] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={dragOver ? '#E8799E' : '#94A3B8'} strokeWidth="1.5" className="mx-auto mb-3">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            <p className="text-sm font-medium text-[#3A2A4A]">Drop a video file here</p>
            <p className="text-xs text-gray-500 mt-1">or click to browse (max 200 MB)</p>
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              onChange={handleFile}
              className="hidden"
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
            <div className="w-10 h-10 rounded-lg bg-[#E8799E]/10 flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8799E" strokeWidth="1.5">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#3A2A4A] truncate">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
            </div>
            <button type="button" onClick={() => setFile(null)} className="text-xs text-red-500 hover:text-red-700 shrink-0">
              Change
            </button>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Service delivery observation"
            className="care-input w-full rounded-lg border px-3 py-2 text-sm text-[#3A2A4A]"
            required
            disabled={uploading}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description of this recording"
            rows={2}
            className="care-input w-full rounded-lg border px-3 py-2 text-sm text-[#3A2A4A] resize-none"
            disabled={uploading}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as VideoCategory)}
            className="care-input w-full rounded-lg border px-3 py-2 text-sm text-[#3A2A4A]"
            disabled={uploading}
          >
            {VIDEO_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        {uploading && (
          <div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#E8799E] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">Uploading… {progress}%</p>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={!file || !title.trim() || uploading}
            className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-lg text-white bg-[#E8799E] hover:bg-[#D06085] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? 'Uploading…' : 'Upload Video'}
          </button>
        </div>
      </form>
    </div>
  )
}
