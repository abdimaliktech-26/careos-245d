import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditEvent } from '@/lib/audit/log'
import type { UserProfile } from '@/types/app'

type Props = { params: Promise<{ documentId: string }> }

export async function GET(request: NextRequest, { params }: Props) {
  const { documentId } = await params
  const admin = createAdminClient()

  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  let organizationId: string
  let actor: UserProfile | null = null

  if (token) {
    const { data: link, error: linkError } = await admin
      .from('signing_links')
      .select('organization_id, completed_at, expires_at, is_revoked')
      .eq('token', token)
      .single()

    if (linkError || !link || link.is_revoked || link.completed_at) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Link expired' }, { status: 401 })
    }

    organizationId = link.organization_id
  } else {
    const { user, error } = await getSession()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    organizationId = user.organizationId!
    actor = user
  }

  const { data: document, error: documentError } = await admin
    .from('documents')
    .select('id, organization_id, display_name, storage_bucket, storage_path, mime_type')
    .eq('id', documentId)
    .eq('organization_id', organizationId)
    .single()

  if (documentError || !document) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error: downloadError } = await admin.storage
    .from(document.storage_bucket)
    .download(document.storage_path)

  if (downloadError || !data) return NextResponse.json({ error: downloadError?.message ?? 'Download failed' }, { status: 500 })

  if (actor) {
    await logAuditEvent({
      user: actor,
      action: 'file_viewed',
      entityType: 'document',
      entityId: document.id,
      entityLabel: document.display_name,
    }).catch(() => null)
  }

  return new NextResponse(data, {
    headers: {
      'Content-Type': document.mime_type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${document.display_name.replace(/"/g, '')}"`,
    },
  })
}
