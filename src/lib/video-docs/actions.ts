'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { VIDEO_CATEGORIES, VIDEO_BUCKET, type VideoCategory, type VideoDocument } from '@/types/video-docs'

export async function getCategories(): Promise<{ value: VideoCategory; label: string }[]> {
  return VIDEO_CATEGORIES
}

export async function getClientVideos(clientId: string): Promise<VideoDocument[]> {
  const { user, error } = await getSession()
  if (error || !user) throw new Error('Unauthorized')

  const admin = createAdminClient()
  const { data, error: dbError } = await admin
    .from('video_documents')
    .select('*')
    .eq('client_id', clientId)
    .eq('organization_id', user.organizationId)
    .order('recorded_at', { ascending: false })

  if (dbError) throw dbError
  return data ?? []
}

export async function getVideo(id: string): Promise<{ video: VideoDocument; signedUrl: string }> {
  const { user, error } = await getSession()
  if (error || !user) throw new Error('Unauthorized')

  const admin = createAdminClient()
  const { data, error: dbError } = await admin
    .from('video_documents')
    .select('*')
    .eq('id', id)
    .eq('organization_id', user.organizationId)
    .single()

  if (dbError || !data) throw new Error(dbError?.message ?? 'Video not found')

  const { data: signedData, error: signError } = await admin.storage
    .from(VIDEO_BUCKET)
    .createSignedUrl(data.storage_path, 3600)

  if (signError || !signedData) throw new Error(signError?.message ?? 'Failed to generate signed URL')

  return { video: data as VideoDocument, signedUrl: signedData.signedUrl }
}

export async function deleteVideo(id: string): Promise<void> {
  const { user, error } = await getSession()
  if (error || !user) throw new Error('Unauthorized')

  const admin = createAdminClient()
  const { data, error: fetchError } = await admin
    .from('video_documents')
    .select('id, storage_bucket, storage_path')
    .eq('id', id)
    .eq('organization_id', user.organizationId)
    .single()

  if (fetchError || !data) throw new Error(fetchError?.message ?? 'Video not found')

  const { error: storageError } = await admin.storage
    .from(data.storage_bucket)
    .remove([data.storage_path])

  if (storageError) throw storageError

  const { error: deleteError } = await admin
    .from('video_documents')
    .delete()
    .eq('id', id)

  if (deleteError) throw deleteError
}

export async function uploadVideo(
  file: File,
  metadata: {
    clientId: string
    title: string
    description?: string
    category: VideoCategory
    durationSeconds?: number
  }
): Promise<VideoDocument> {
  const { user, error } = await getSession()
  if (error || !user) throw new Error('Unauthorized')
  if (!user.organizationId) throw new Error('No organization')

  const admin = createAdminClient()
  const { data: buckets } = await admin.storage.listBuckets()
  if (!buckets?.some((b) => b.name === VIDEO_BUCKET)) {
    const { error: createError } = await admin.storage.createBucket(VIDEO_BUCKET, {
      public: false,
      fileSizeLimit: 200 * 1024 * 1024,
    })
    if (createError) throw createError
  }

  const videoId = crypto.randomUUID()
  const ext = file.name.split('.').pop() ?? 'mp4'
  const storagePath = `${user.organizationId}/${metadata.clientId}/${videoId}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const { error: uploadError } = await admin.storage
    .from(VIDEO_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || 'video/mp4',
      upsert: false,
    })

  if (uploadError) throw uploadError

  const { data: record, error: insertError } = await admin
    .from('video_documents')
    .insert({
      id: videoId,
      organization_id: user.organizationId,
      client_id: metadata.clientId,
      title: metadata.title,
      description: metadata.description ?? null,
      category: metadata.category,
      storage_bucket: VIDEO_BUCKET,
      storage_path: storagePath,
      file_size: file.size,
      mime_type: file.type || 'video/mp4',
      duration_seconds: metadata.durationSeconds ?? null,
      recorded_by: user.id,
    })
    .select()
    .single()

  if (insertError) {
    await admin.storage.from(VIDEO_BUCKET).remove([storagePath]).catch(() => {})
    throw insertError
  }

  return record as VideoDocument
}
