import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { generateCompletedFormDocument, storeCompletedFormDocument } from '@/lib/documents/form-documents'
import { logAuditEvent } from '@/lib/audit/log'

type Props = { params: Promise<{ packetFormId: string }> }

export async function GET(_request: NextRequest, { params }: Props) {
  const { user, error } = await getSession()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { packetFormId } = await params

  try {
    const document = await storeCompletedFormDocument(packetFormId).catch(async () =>
      generateCompletedFormDocument(packetFormId)
    )
    await logAuditEvent({
      user,
      action: 'pdf_downloaded',
      entityType: 'packet_form',
      entityId: packetFormId,
      entityLabel: document.displayName,
    }).catch(() => null)

    return new NextResponse(document.html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${document.fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (downloadError) {
    const message = downloadError instanceof Error ? downloadError.message : 'Unable to download document'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
