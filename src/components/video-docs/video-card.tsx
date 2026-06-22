import type { VideoDocument } from '@/types/video-docs'

const CATEGORY_COLORS: Record<string, string> = {
  service_delivery: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  incident_evidence: 'bg-status-error-bg text-status-error',
  training: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  consent: 'bg-status-ok-bg text-status-ok',
  other: 'bg-muted text-muted-foreground',
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type Props = {
  video: VideoDocument
  onPlay: () => void
  onDelete: () => void
}

export function VideoCard({ video, onPlay, onDelete }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <button
        onClick={onPlay}
        className="w-full aspect-video bg-muted flex items-center justify-center hover:bg-muted transition-colors relative group cursor-pointer"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center group-hover:bg-primary transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <polygon points="8,5 19,12 8,19" />
            </svg>
          </div>
        </div>
        {video.duration_seconds && (
          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] font-semibold px-2 py-0.5 rounded">
            {formatDuration(video.duration_seconds)}
          </span>
        )}
      </button>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground truncate">{video.title}</h3>
            {video.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{video.description}</p>
            )}
          </div>
          <button
            onClick={onDelete}
            className="shrink-0 p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
            title="Delete video"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[video.category] ?? 'bg-muted text-muted-foreground'}`}>
            {video.category.replace(/_/g, ' ')}
          </span>
          {video.file_size && (
            <span className="text-[10px] text-muted-foreground">{formatFileSize(video.file_size)}</span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">{formatDate(video.recorded_at)}</p>
      </div>
    </div>
  )
}
