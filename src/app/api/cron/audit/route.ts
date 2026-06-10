import { NextResponse, type NextRequest } from 'next/server'
import {
  processQueuedAuditNotifications,
  runScheduledAuditForAllOrganizations,
} from '@/lib/audit/assistant'

export const runtime = 'nodejs'

function isAuthorized(request: NextRequest) {
  const configuredSecret = process.env.AUDIT_CRON_SECRET ?? process.env.CRON_SECRET
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
    const auditResults = await runScheduledAuditForAllOrganizations()
    const notificationResults = await processQueuedAuditNotifications()

    return NextResponse.json({
      ok: true,
      auditedOrganizations: auditResults.length,
      auditResults,
      processedNotifications: notificationResults.length,
      notificationResults,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Scheduled audit failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
