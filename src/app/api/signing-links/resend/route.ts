import { NextRequest, NextResponse } from 'next/server'
import { resendSigningLink } from '@/lib/signing-links/actions'

export async function POST(req: NextRequest) {
  const { linkId } = await req.json()
  if (!linkId || typeof linkId !== 'string') {
    return NextResponse.json({ error: 'linkId is required' }, { status: 400 })
  }

  const result = await resendSigningLink(linkId)
  if (result.error) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true, link: result.link })
}
