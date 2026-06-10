import { createClient } from '@/lib/supabase/server'

export async function processQueuedNotifications() {
  const supabase = await createClient()
  const { data: queued } = await supabase
    .from('audit_notifications')
    .select('*')
    .eq('status', 'queued')
    .limit(20)

  for (const n of queued ?? []) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: n.channel,
          recipient: n.recipient,
          subject: n.subject,
          message: n.message,
        }),
      })
    } catch { /* swallow */ }
  }
}
