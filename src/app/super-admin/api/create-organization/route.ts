import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, phone, address, city, state, zip, createAdmin, adminName, adminEmail } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Organization name is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: org, error } = await admin
      .from('organizations')
      .insert({
        name: name.trim(),
        email: email || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        state: state || 'MN',
        zip: zip || null,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error || !org) {
      return NextResponse.json({ error: error?.message ?? 'Failed to create organization' }, { status: 500 })
    }

    let adminPassword: string | null = null

    if (createAdmin && adminEmail && adminEmail.includes('@')) {
      const fullName = adminName?.trim() || adminEmail.split('@')[0]
      const temporaryPassword = `Org-${randomBytes(9).toString('base64url')}!`

      const { data: authData } = await admin.auth.admin.createUser({
        email: adminEmail.trim(),
        email_confirm: true,
        password: temporaryPassword,
        user_metadata: { role: 'org_admin', organization_id: org.id },
      })

      if (authData?.user) {
        await admin.from('organization_members').insert({
          organization_id: org.id,
          user_id: authData.user.id,
          role: 'org_admin',
          full_name: fullName,
          email: adminEmail.trim(),
          is_active: true,
          joined_at: new Date().toISOString(),
        })

        adminPassword = temporaryPassword

        // Send welcome email via Resend if configured
        const resendKey = process.env.RESEND_API_KEY
        if (resendKey) {
          try {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: 'CareIntake <welcome@careintake.app>',
                to: [adminEmail.trim()],
                subject: `Welcome to CareIntake — ${name.trim()}`,
                html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
                  <h2 style="color:#E8799E">Welcome to CareIntake, ${fullName}!</h2>
                  <p>Your organization <strong>${name.trim()}</strong> has been created on the CareIntake 245D Suite platform.</p>
                  <p>You can log in with the following credentials:</p>
                  <div style="background:#EEF2FF;border-radius:12px;padding:16px;margin:16px 0">
                    <p><strong>Email:</strong> ${adminEmail.trim()}</p>
                    <p><strong>Temporary Password:</strong> <code style="background:#fff;padding:4px 8px;border-radius:4px;font-size:14px">${temporaryPassword}</code></p>
                  </div>
                  <p>You'll be prompted to change your password on first login.</p>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/login" style="display:inline-block;background:linear-gradient(135deg,#E8799E,#C8A8E8);color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:bold;margin-top:8px">Sign In</a>
                  <p style="color:#64748B;font-size:12px;margin-top:24px">CareIntake 245D Suite — Minnesota HCBS compliance platform</p>
                </div>`,
              }),
            })
          } catch {
            // email failure is non-fatal
          }
        }
      }
    }

    return NextResponse.json({ id: org.id, adminPassword })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
