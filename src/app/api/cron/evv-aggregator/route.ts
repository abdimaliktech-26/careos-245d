import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { processTransmissionQueue } from '@/lib/evv/aggregator/queue'

export const runtime = 'nodejs'

function isAuthorized(request: NextRequest) {
  const configuredSecret = process.env.CRON_SECRET
  if (!configuredSecret) return false

  const authHeader = request.headers.get('authorization')
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
  const querySecret = request.nextUrl.searchParams.get('secret')
  return bearer === configuredSecret || querySecret === configuredSecret
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const summary = await processTransmissionQueue(admin)
    return NextResponse.json({ ok: true, ...summary })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Aggregator queue run failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
