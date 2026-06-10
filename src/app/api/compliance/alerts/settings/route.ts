import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { getAlertSettings, updateAlertSettings } from '@/lib/audit/compliance-alerts'

export async function GET() {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await getAlertSettings(user.organizationId)
  return NextResponse.json(settings)
}

export async function PUT(request: NextRequest) {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['org_admin', 'super_admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const ok = await updateAlertSettings(user.organizationId, body)
  return NextResponse.json({ ok })
}
