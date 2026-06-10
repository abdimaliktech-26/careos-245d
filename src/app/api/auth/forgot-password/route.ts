import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const supabase = await createClient()

  // Primary: use Supabase's built-in email (requires SMTP configured in Supabase dashboard)
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${req.nextUrl.origin}/auth/reset-password`,
  })

  // If Supabase email fails (e.g. SMTP not configured), fallback to Resend
  if (error) {
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    try {
      const admin = createAdminClient()

      // Generate a password reset link via Supabase Admin API
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: `${req.nextUrl.origin}/auth/reset-password` },
      })

      if (linkError || !linkData?.properties?.action_link) {
        return NextResponse.json({ error: linkError?.message ?? 'Failed to generate reset link' }, { status: 500 })
      }

      const resetLink = linkData.properties.action_link
      const appName = 'CareIntake'

      // Send via Resend
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${appName} <noreply@careintake.app>`,
          to: [email],
          subject: `Reset Your ${appName} Password`,
          html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F8FAFC;padding:40px 0">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#E8799E,#C8A8E8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:20px;font-weight:800">${appName}</div>
  <h1 style="color:#3A2A4A;font-size:22px;margin:24px 0 12px">Reset Your Password</h1>
  <p style="color:#64748B;font-size:14px;line-height:1.6">We received a request to reset your password. Click below to set a new one.</p>
  <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#E8799E,#C8A8E8);color:#fff;padding:12px 28px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;margin-top:8px">Reset Password</a>
  <p style="font-size:12px;color:#94A3B8;margin-top:20px">This link expires in 1 hour. Ignore if you didn't request this.</p>
  <div style="margin-top:32px;padding-top:20px;border-top:1px solid #E5E7EB">
    <p style="color:#94A3B8;font-size:12px;margin:0">${appName} 245D Suite — Minnesota HCBS Compliance Platform</p>
  </div>
</div>
</body>
</html>`,
        }),
      })

      if (!emailRes.ok) {
        const errBody = await emailRes.text()
        return NextResponse.json({ error: `Email delivery failed: ${errBody}` }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    } catch (fallbackErr) {
      const msg = fallbackErr instanceof Error ? fallbackErr.message : 'Email delivery failed'
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
