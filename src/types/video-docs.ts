export type VideoDocument = {
  id: string
  organization_id: string
  client_id: string
  title: string
  description: string | null
  category: VideoCategory
  storage_bucket: string
  storage_path: string
  file_size: number | null
  mime_type: string
  duration_seconds: number | null
  recorded_by: string
  recorded_at: string
  created_at: string
}

export type VideoCategory = 'service_delivery' | 'incident_evidence' | 'training' | 'consent' | 'other'

export const VIDEO_CATEGORIES: { value: VideoCategory; label: string }[] = [
  { value: 'service_delivery', label: 'Service Delivery' },
  { value: 'incident_evidence', label: 'Incident Evidence' },
  { value: 'training', label: 'Training' },
  { value: 'consent', label: 'Consent' },
  { value: 'other', label: 'Other' },
]

export const VIDEO_BUCKET = 'video_docs'
