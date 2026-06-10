import { createClient } from '@/lib/supabase/server'

export type WebhookType = 'slack' | 'teams' | 'generic'

export type WebhookConfig = {
  type: WebhookType
  url: string
  enabled: boolean
}

export const WEBHOOK_EVENT_TYPES = [
  'audit.alert',
  'packet.completed',
  'incident.reported',
  'signature.collected',
  'form.submitted',
  'schedule.conflict',
  'evv.missed',
] as const

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number]

type WebhookResult = { sent: boolean; error?: string }

function slackMessage(text: string) {
  return {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: 'CareIntake Alert', emoji: true },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: text.slice(0, 3000) },
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `CareIntake 245D Suite · ${new Date().toLocaleDateString('en-US')}` },
        ],
      },
    ],
  }
}

function teamsMessage(title: string, text: string) {
  return {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: '4361EE',
    summary: title,
    title,
    text: text.slice(0, 2000),
    potentialAction: [],
  }
}

export async function sendSlackWebhook(webhookUrl: string, message: string): Promise<WebhookResult> {
  if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
    return { sent: false, error: 'Invalid Slack webhook URL' }
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage(message)),
    })
    return response.ok
      ? { sent: true }
      : { sent: false, error: `Slack webhook error ${response.status}` }
  } catch {
    return { sent: false, error: 'Failed to reach Slack webhook' }
  }
}

export async function sendTeamsWebhook(webhookUrl: string, title: string, message: string): Promise<WebhookResult> {
  if (!webhookUrl.startsWith('https://')) {
    return { sent: false, error: 'Invalid Teams webhook URL' }
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teamsMessage(title, message)),
    })
    return response.ok
      ? { sent: true }
      : { sent: false, error: `Teams webhook error ${response.status}` }
  } catch {
    return { sent: false, error: 'Failed to reach Teams webhook' }
  }
}

export async function sendGenericWebhook(webhookUrl: string, payload: unknown): Promise<WebhookResult> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return response.ok
      ? { sent: true }
      : { sent: false, error: `Webhook error ${response.status}` }
  } catch {
    return { sent: false, error: 'Failed to reach webhook URL' }
  }
}

export async function sendWebhookNotification(
  type: WebhookType,
  webhookUrl: string,
  title: string,
  message: string
): Promise<WebhookResult> {
  switch (type) {
    case 'slack':
      return sendSlackWebhook(webhookUrl, message)
    case 'teams':
      return sendTeamsWebhook(webhookUrl, title, message)
    case 'generic':
      return sendGenericWebhook(webhookUrl, { title, message, timestamp: new Date().toISOString() })
  }
}

export async function deliverWebhook(
  organizationId: string,
  type: WebhookType,
  webhookUrl: string,
  eventType: WebhookEventType,
  title: string,
  message: string,
  payload?: unknown
): Promise<WebhookResult> {
  const result = await sendWebhookNotification(type, webhookUrl, title, message)

  try {
    const supabase = await createClient()
    await supabase.from('webhook_logs').insert({
      organization_id: organizationId,
      webhook_type: type,
      webhook_url: webhookUrl,
      event_type: eventType,
      payload: payload ? JSON.parse(JSON.stringify(payload)) : null,
      response_status: result.sent ? 200 : null,
      success: result.sent,
      error_message: result.error ?? null,
    })
  } catch {
  }

  return result
}
