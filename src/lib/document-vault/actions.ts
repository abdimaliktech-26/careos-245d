'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession } from '@/lib/auth/get-session'
import { logAuditEvent } from '@/lib/audit/log'
import { createAdminClient } from '@/lib/supabase/admin'

type ActionState = { error: string | null; success?: string | null }

const CATEGORIES = [
  'cssp',
  'cssp_addendum',
  'assessment',
  'service_agreement',
  'medical',
  'guardian',
  'county',
  'background_study',
  'training_certificate',
  'incident_attachment',
  'completed_form',
  'other',
] as const

const uploadSchema = z.object({
  clientId: z.string().uuid().optional().or(z.literal('')),
  staffId: z.string().uuid().optional().or(z.literal('')),
  category: z.enum(CATEGORIES),
  displayName: z.string().min(2, 'Document name is required').max(180),
  description: z.string().max(1000).optional(),
})

function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'document'
}

async function ensureBucket() {
  const admin = createAdminClient()
  const { data: buckets, error } = await admin.storage.listBuckets()
  if (error) throw error
  if (buckets?.some((bucket) => bucket.name === 'documents')) return
  const { error: createError } = await admin.storage.createBucket('documents', {
    public: false,
    fileSizeLimit: 20 * 1024 * 1024,
  })
  if (createError) throw createError
}

export async function uploadDocument(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }
  if (!['staff', 'program_manager', 'org_admin', 'super_admin'].includes(user.role)) return { error: 'Unauthorized' }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a file to upload' }
  if (file.size > 20 * 1024 * 1024) return { error: 'File must be 20MB or smaller' }

  const parsed = uploadSchema.safeParse({
    clientId: (formData.get('clientId') as string) || '',
    staffId: (formData.get('staffId') as string) || '',
    category: formData.get('category') as string,
    displayName: formData.get('displayName') as string,
    description: (formData.get('description') as string) || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const admin = createAdminClient()
  await ensureBucket()

  const bytes = Buffer.from(await file.arrayBuffer())
  const folder = parsed.data.clientId || parsed.data.staffId || 'organization'
  const storagePath = `${user.organizationId}/${folder}/${parsed.data.category}/${Date.now()}-${safeName(file.name)}`
  const { error: uploadError } = await admin.storage.from('documents').upload(storagePath, bytes, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  })
  if (uploadError) return { error: uploadError.message }

  const { data, error } = await admin
    .from('documents')
    .insert({
      organization_id: user.organizationId,
      client_id: parsed.data.clientId || null,
      staff_id: parsed.data.staffId || null,
      category: parsed.data.category,
      display_name: parsed.data.displayName,
      description: parsed.data.description || null,
      storage_bucket: 'documents',
      storage_path: storagePath,
      file_size: file.size,
      mime_type: file.type || null,
      uploaded_by: user.id,
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Document uploaded but metadata failed' }

  await logAuditEvent({
    user,
    action: 'file_uploaded',
    entityType: 'document',
    entityId: data.id,
    entityLabel: parsed.data.displayName,
    details: { category: parsed.data.category, fileSize: file.size },
  }).catch(() => null)

  revalidatePath('/documents')
  if (parsed.data.clientId) revalidatePath(`/clients/${parsed.data.clientId}`)
  revalidatePath('/admin/audit-assistant')
  return { error: null, success: 'Document uploaded.' }
}

export async function deleteDocument(documentId: string): Promise<{ error: string | null }> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }
  if (!['org_admin', 'super_admin', 'program_manager'].includes(user.role)) return { error: 'Insufficient permissions' }

  const admin = createAdminClient()

  const { data: doc, error: docError } = await admin
    .from('documents')
    .select('id, storage_bucket, storage_path, display_name')
    .eq('id', documentId)
    .eq('organization_id', user.organizationId)
    .single()

  if (docError || !doc) return { error: 'Document not found' }

  const { error: storageError } = await admin.storage
    .from(doc.storage_bucket)
    .remove([doc.storage_path])

  if (storageError) return { error: `Failed to delete file: ${storageError.message}` }

  const { error: deleteError } = await admin
    .from('documents')
    .delete()
    .eq('id', documentId)
    .eq('organization_id', user.organizationId)

  if (deleteError) return { error: deleteError.message }

  await logAuditEvent({
    user,
    action: 'file_deleted',
    entityType: 'document',
    entityId: doc.id,
    entityLabel: doc.display_name,
  }).catch(() => null)

  revalidatePath('/documents')
  return { error: null }
}

export async function getDocumentCategories(): Promise<Array<{ value: string; label: string }>> {
  const labels: Record<string, string> = {
    cssp: 'CSSP',
    cssp_addendum: 'CSSP Addendum',
    assessment: 'Assessment',
    service_agreement: 'Service Agreement',
    medical: 'Medical',
    guardian: 'Guardian',
    county: 'County',
    background_study: 'Background Study',
    training_certificate: 'Training Certificate',
    incident_attachment: 'Incident Attachment',
    completed_form: 'Completed Form',
    other: 'Other',
  }
  return CATEGORIES.map((c) => ({ value: c, label: labels[c] ?? c }))
}
