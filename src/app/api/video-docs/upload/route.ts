import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { uploadVideo } from '@/lib/video-docs/actions'

export async function POST(request: NextRequest) {
  const { user, error } = await getSession()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const clientId = formData.get('clientId') as string
    const title = formData.get('title') as string
    const description = (formData.get('description') as string) || undefined
    const category = (formData.get('category') as string) || 'service_delivery'
    const durationSeconds = formData.get('durationSeconds')
      ? parseInt(formData.get('durationSeconds') as string, 10)
      : undefined

    if (!clientId || !title) {
      return NextResponse.json({ error: 'clientId and title are required' }, { status: 400 })
    }

    const validCategories = ['service_delivery', 'incident_evidence', 'training', 'consent', 'other']
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    const result = await uploadVideo(file, {
      clientId,
      title,
      description,
      category: category as 'service_delivery' | 'incident_evidence' | 'training' | 'consent' | 'other',
      durationSeconds,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
