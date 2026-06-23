import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession } from '@/lib/auth/get-session'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { signingLinkEmail } from '@/lib/notifications/email-templates'

const schema = z.object({
  packetFormId: z.string().uuid(),
  signerName: z.string().min(2).max(140),
  signerEmail: z.string().email().optional().or(z.literal('')),
  signerRole: z.enum(['client', 'guardian']),
  sendEmail: z.coerce.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!['staff', 'program_manager', 'org_admin', 'super_admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const parsed = schema.safeParse({
    packetFormId: formData.get('packetFormId'),
    signerName: formData.get('signerName'),
    signerEmail: formData.get('signerEmail') || '',
    signerRole: formData.get('signerRole'),
    sendEmail: formData.get('sendEmail') === 'true',
  })

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: packetForm, error: formError } = await supabase
    .from('packet_forms')
    .select('id, packet_id, packets!inner(organization_id)')
    .eq('id', parsed.data.packetFormId)
    .single()

  if (formError || !packetForm) {
    return NextResponse.json({ error: formError?.message ?? 'Packet form not found' }, { status: 404 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('signing_links')
    .insert({
      organization_id: user.organizationId,
      packet_id: packetForm.packet_id,
      packet_form_id: parsed.data.packetFormId,
      signer_name: parsed.data.signerName,
      signer_email: parsed.data.signerEmail || null,
      signer_role: parsed.data.signerRole,
      created_by: user.id,
    })
    .select('token')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create signing link' }, { status: 500 })
  }

  const link = `/sign/${data.token}`

  if (parsed.data.sendEmail && parsed.data.signerEmail) {
    const { data: formTemplate } = await admin
      .from('packet_forms')
      .select('form_templates(name)')
      .eq('id', parsed.data.packetFormId)
      .single()

    const templateName = formTemplate?.form_templates
      ? (Array.isArray(formTemplate.form_templates) ? formTemplate.form_templates[0] : formTemplate.form_templates)?.name ?? 'Document'
      : 'Document'

    const { data: org } = await admin
      .from('organizations')
      .select('name')
      .eq('id', user.organizationId)
      .single()

    const emailHtml = signingLinkEmail({
      orgName: org?.name ?? 'Your Organization',
      documentName: templateName,
      signerName: parsed.data.signerName,
      signingLink: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}${link}`,
      senderName: user.fullName,
    })

    try {
      const resendKey = process.env.RESEND_API_KEY
      if (resendKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Higsi <notifications@higsi.app>',
            to: [parsed.data.signerEmail],
            subject: `Sign: ${templateName} - ${org?.name ?? ''}`,
            html: emailHtml,
          }),
        })
      }
    } catch {
      // email delivery failure is non-fatal
    }
  }

  revalidatePath('/clients')
  return NextResponse.json({ link, success: 'Signing link created.' })
}
