import { NextRequest, NextResponse } from 'next/server'
import { getSigningLinkStatus } from '@/lib/signing-links/actions'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'token query parameter is required' }, { status: 400 })
  }

  const result = await getSigningLinkStatus(token)
  if (result.error) {
    return NextResponse.json({ success: false, error: result.error }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: result.data })
}
