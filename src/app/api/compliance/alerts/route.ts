import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { getActiveAlerts, getAlertSummary } from '@/lib/audit/compliance-alerts'

export async function GET(request: NextRequest) {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 100)
  const type = searchParams.get('type') ?? undefined
  const severity = searchParams.get('severity') ?? undefined

  const [alerts, summary] = await Promise.all([
    getActiveAlerts(user.organizationId, { type, severity }),
    getAlertSummary(user.organizationId),
  ])

  return NextResponse.json({ alerts: alerts.slice(0, limit), summary })
}
