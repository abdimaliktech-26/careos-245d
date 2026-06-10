import { createAdminClient } from '@/lib/supabase/admin'
import { deliverWebhook, type WebhookEventType } from '@/lib/notifications/webhooks'

export type BroadcastChannel = 'email' | 'slack' | 'teams' | 'webhook'

export async function broadcastAlert(params: {
  organizationId: string
  eventType: WebhookEventType
  title: string
  message: string
  payload?: unknown
}): Promise<{ sent: string[]; failed: string[] }> {
  const sent: string[] = []
  const failed: string[] = []

  const admin = createAdminClient()
  const { data: org } = await admin
    .from('organizations')
    .select('name, slack_webhook_url, teams_webhook_url')
    .eq('id', params.organizationId)
    .single()

  if (!org) return { sent, failed }

  const webhooks: { type: 'slack' | 'teams'; url: string }[] = []

  if (org.slack_webhook_url) {
    webhooks.push({ type: 'slack', url: org.slack_webhook_url })
  }
  if (org.teams_webhook_url) {
    webhooks.push({ type: 'teams', url: org.teams_webhook_url })
  }

  for (const wh of webhooks) {
    try {
      const result = await deliverWebhook(
        params.organizationId,
        wh.type,
        wh.url,
        params.eventType,
        params.title,
        params.message,
        params.payload,
      )
      if (result.sent) sent.push(wh.type)
      else failed.push(wh.type)
    } catch {
      failed.push(wh.type)
    }
  }

  return { sent, failed }
}

export async function getBroadcastChannels(organizationId: string): Promise<BroadcastChannel[]> {
  const channels: BroadcastChannel[] = []

  const admin = createAdminClient()
  const { data: org } = await admin
    .from('organizations')
    .select('slack_webhook_url, teams_webhook_url')
    .eq('id', organizationId)
    .single()

  if (org) {
    if (org.slack_webhook_url) channels.push('slack')
    if (org.teams_webhook_url) channels.push('teams')
  }

  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) channels.push('email')

  channels.push('webhook')
  return channels
}
