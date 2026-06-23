import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { channel, recipient, subject, message } = await req.json()
  if (!channel || !recipient || !message) {
    return NextResponse.json({ error: 'channel, recipient, and message required' }, { status: 400 })
  }

  const supabase = await createClient()
  const result = { sent: true, error: null as string | null }

  if (channel === 'email') {
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return NextResponse.json({ error: 'Email not configured' }, { status: 501 })

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'Higsi <notifications@higsi.app>', to: [recipient], subject: subject ?? 'Higsi Notification', html: message }),
      })
      if (!res.ok) result.sent = false
    } catch { result.sent = false; result.error = 'Email delivery failed' }
  } else if (channel === 'sms') {
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
    const twilioFrom = process.env.TWILIO_FROM_NUMBER
    if (!twilioAccountSid || !twilioAuthToken || !twilioFrom) {
      return NextResponse.json({ error: 'SMS not configured' }, { status: 501 })
    }

    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: recipient, From: twilioFrom, Body: message }),
      })
      if (!res.ok) result.sent = false
    } catch { result.sent = false; result.error = 'SMS delivery failed' }
  } else {
    return NextResponse.json({ error: 'Invalid channel (use email or sms)' }, { status: 400 })
  }

  try {
    await supabase.from('audit_notifications').insert({
      organization_id: user.organizationId,
      channel,
      recipient,
      subject: subject ?? null,
      message,
      status: result.sent ? 'sent' : 'failed',
    })
  } catch {}

  return NextResponse.json(result)
}
