import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateCompletedFormDocument } from '@/lib/documents/form-documents'
import { logAuditEvent } from '@/lib/audit/log'

type Props = { params: Promise<{ documentId: string }> }

export async function GET(request: NextRequest, { params }: Props) {
  const { documentId } = await params
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  let organizationId: string | null = null
  let actor: { id: string; email: string; organizationId: string | null; role: string; fullName: string; isActive: boolean } | null = null

  if (token) {
    const admin = createAdminClient()
    const { data: link } = await admin
      .from('signing_links')
      .select('organization_id, completed_at, expires_at, is_revoked')
      .eq('token', token)
      .single()

    if (!link || link.is_revoked || link.completed_at) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Link expired' }, { status: 401 })
    }
    organizationId = link.organization_id
  } else {
    const { user, error: sessionError } = await getSession()
    if (sessionError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    organizationId = user.organizationId
    actor = user
  }

  if (!organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: document, error: documentError } = await admin
    .from('documents')
    .select('id, packet_id, display_name, category')
    .eq('id', documentId)
    .eq('organization_id', organizationId)
    .single()

  if (documentError || !document) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let packetFormId: string | null = null
  if (document.category === 'completed_form' && document.packet_id) {
    const { data: pf } = await admin
      .from('packet_forms')
      .select('id')
      .eq('packet_id', document.packet_id)
      .eq('status', 'completed')
      .limit(1)
      .maybeSingle()
    if (pf) packetFormId = pf.id
  }

  if (!packetFormId) {
    const { data: docData } = await admin
      .from('documents')
      .select('storage_path')
      .eq('id', documentId)
      .single()

    if (!docData?.storage_path) {
      return NextResponse.json({ error: 'Cannot generate PDF for this document type' }, { status: 400 })
    }

    const { data: fileData } = await admin.storage
      .from('documents')
      .download(docData.storage_path)

    if (!fileData) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const text = await fileData.text()

    const pdfHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>${document.display_name}</title>
<style>
  @page { size: letter; margin: 0.75in; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.5; font-size: 12px; }
  @media print { .no-print { display: none; } }
  header { text-align: center; border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 16px; }
  h1 { font-size: 18px; margin: 0; }
  .content { padding: 0; }
  footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #d1d5db; font-size: 10px; color: #6b7280; text-align: center; }
</style>
</head>
<body>
  <header><h1>${document.display_name}</h1></header>
  <div class="content">${text}</div>
  <footer>Exported from CareIntake 245D Suite</footer>
</body>
</html>`

    if (actor) {
      await logAuditEvent({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        user: actor as any,
        action: 'pdf_downloaded',
        entityType: 'document',
        entityId: document.id,
        entityLabel: `PDF export: ${document.display_name}`,
      }).catch(() => null)
    }

    return new NextResponse(pdfHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${document.display_name.replace(/"/g, '')}.pdf"`,
      },
    })
  }

  const formDoc = await generateCompletedFormDocument(packetFormId).catch(() => null)
  if (!formDoc) {
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 })
  }

  if (actor) {
    await logAuditEvent({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: actor as any,
      action: 'pdf_downloaded',
      entityType: 'document',
      entityId: document.id,
      entityLabel: `PDF export: ${document.display_name}`,
    }).catch(() => null)
  }

  const pdfHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>${document.display_name}</title>
<style>
  @page { size: letter; margin: 0.5in; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; margin: 0; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @media print { body { margin: 0.5in; } .no-print { display: none; } }
  ${formDoc.html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? ''}
</style>
</head>
<body>
  ${formDoc.html.match(/<body>([\s\S]*?)<\/body>/)?.[1] ?? formDoc.html}
  <footer style="text-align:center;padding-top:8px;border-top:1px solid #d1d5db;font-size:10px;color:#6b7280;margin-top:32px;">
    Generated by CareIntake 245D Suite &middot; ${new Date().toLocaleDateString('en-US')}
  </footer>
</body>
</html>`

  return new NextResponse(pdfHtml, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${document.display_name.replace(/"/g, '')}.pdf"`,
    },
  })
}
