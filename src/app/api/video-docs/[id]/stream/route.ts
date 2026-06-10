import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { getVideo } from '@/lib/video-docs/actions'

type Props = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Props) {
  const { user, error } = await getSession()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const { signedUrl } = await getVideo(id)
    return NextResponse.redirect(signedUrl)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to stream video'
    return NextResponse.json({ error: message }, { status: 404 })
  }
}
