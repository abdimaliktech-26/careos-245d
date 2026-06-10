import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { storeCompletedFormDocument } from '@/lib/documents/form-documents'

type Props = { params: Promise<{ packetFormId: string }> }

export async function POST(_request: NextRequest, { params }: Props) {
  const { user, error } = await getSession()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['staff', 'program_manager', 'org_admin', 'super_admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { packetFormId } = await params

  try {
    const doc = await storeCompletedFormDocument(packetFormId)
    return NextResponse.json({ success: true, displayName: doc.displayName })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to store document'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
