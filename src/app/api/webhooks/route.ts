import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { WEBHOOK_EVENT_TYPES, deliverWebhook } from '@/lib/notifications/webhooks'

export async function GET() {
  const { user, error } = await getSession()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data: org } = await supabase
    .from('organizations')
    .select('name, slack_webhook_url, teams_webhook_url')
    .eq('id', user.organizationId)
    .single()

  const webhooks: Array<{ type: string; url: string | null; enabled: boolean }> = []
  if (org?.slack_webhook_url) {
    webhooks.push({ type: 'slack', url: org.slack_webhook_url, enabled: true })
  }
  if (org?.teams_webhook_url) {
    webhooks.push({ type: 'teams', url: org.teams_webhook_url, enabled: true })
  }

  return NextResponse.json({
    webhooks,
    eventTypes: WEBHOOK_EVENT_TYPES,
    organization: org?.name ?? null,
  })
}

export async function POST(req: NextRequest) {
  const { user, error } = await getSession()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as {
    type: string
    url: string
  }

  if (!body.type || !body.url) {
    return NextResponse.json({ error: 'type and url are required' }, { status: 400 })
  }

  if (!['slack', 'teams', 'generic'].includes(body.type)) {
    return NextResponse.json({ error: 'Invalid webhook type' }, { status: 400 })
  }

  if (!user.organizationId) {
    return NextResponse.json({ error: 'No organization' }, { status: 400 })
  }

  const result = await deliverWebhook(
    user.organizationId,
    body.type as never,
    body.url,
    'audit.alert',
    'CareIntake Webhook Test',
    'This is a test notification from CareIntake. Your webhook is configured correctly.',
    { test: true, timestamp: new Date().toISOString() }
  )

  return NextResponse.json(result)
}
