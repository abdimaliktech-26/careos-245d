'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession } from '@/lib/auth/get-session'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { validateRequiredSignatures } from '@/lib/forms/signature-validation'
import { storeCompletedFormDocument } from '@/lib/documents/form-documents'
import { autoGenerateClaim } from '@/lib/billing/auto-billing'
import { signingLinkEmail } from '@/lib/notifications/email-templates'

type ActionState = { error: string | null; success?: string | null; link?: string | null }

export type SigningLinkStatus = {
  status: 'pending' | 'completed' | 'expired' | 'revoked'
  expiresAt: string | null
  completedAt: string | null
  createdAt: string
}

const createLinkSchema = z.object({
  packetFormId: z.string().uuid(),
  signerName: z.string().min(2, 'Signer name is required').max(140),
  signerEmail: z.string().email().optional().or(z.literal('')),
  signerRole: z.enum(['client', 'guardian']),
})

const signSchema = z.object({
  token: z.string().min(20),
  signerName: z.string().min(2, 'Signer name is required').max(140),
  signatureTyped: z.string().max(180).optional().or(z.literal('')),
  signatureDrawn: z.string().optional().or(z.literal('')),
}).refine((data) => data.signatureTyped || data.signatureDrawn, {
  message: 'Please provide your signature (typed or drawn)',
})

export async function createSigningLink(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }
  if (!['staff', 'program_manager', 'org_admin', 'super_admin'].includes(user.role)) return { error: 'Unauthorized' }

  const parsed = createLinkSchema.safeParse({
    packetFormId: formData.get('packetFormId') as string,
    signerName: formData.get('signerName') as string,
    signerEmail: (formData.get('signerEmail') as string) || '',
    signerRole: formData.get('signerRole') as string,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const sendEmail = formData.get('sendEmail') === 'true'

  const supabase = await createClient()
  const { data: packetForm, error: formError } = await supabase
    .from('packet_forms')
    .select('id, packet_id, packets!inner(organization_id)')
    .eq('id', parsed.data.packetFormId)
    .single()
  if (formError || !packetForm) return { error: formError?.message ?? 'Packet form not found' }

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

  if (error || !data) return { error: error?.message ?? 'Failed to create signing link' }

  const link = `/sign/${data.token}`

  if (sendEmail && parsed.data.signerEmail) {
    try {
      const { data: templateData } = await admin
        .from('packet_forms')
        .select('form_templates(name)')
        .eq('id', parsed.data.packetFormId)
        .single()

      const templateName = templateData?.form_templates
        ? (Array.isArray(templateData.form_templates) ? templateData.form_templates[0] : templateData.form_templates)?.name ?? 'Document'
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
  return { error: null, success: 'Signing link created.', link }
}

export async function completeExternalSignature(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signSchema.safeParse({
    token: formData.get('token') as string,
    signerName: formData.get('signerName') as string,
    signatureTyped: (formData.get('signatureTyped') as string) || '',
    signatureDrawn: (formData.get('signatureDrawn') as string) || '',
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const admin = createAdminClient()
  const { data: link, error: linkError } = await admin
    .from('signing_links')
    .select('id, organization_id, packet_id, packet_form_id, signer_role, signer_email, expires_at, completed_at, is_revoked')
    .eq('token', parsed.data.token)
    .single()

  if (linkError || !link) return { error: 'Signing link not found' }
  if (link.is_revoked) return { error: 'Signing link has been revoked' }
  if (link.completed_at) return { error: 'This signing link has already been completed' }
  if (new Date(link.expires_at as string) < new Date()) return { error: 'Signing link has expired' }
  if (!link.packet_form_id) return { error: 'Signing link is missing a form' }

  const { error: sigError } = await admin.from('signatures').insert({
    organization_id: link.organization_id,
    packet_id: link.packet_id,
    packet_form_id: link.packet_form_id,
    signer_role: link.signer_role,
    signer_name: parsed.data.signerName,
    signer_email: link.signer_email,
    external_signer_id: link.id,
    signature_typed: parsed.data.signatureTyped || null,
    signature_data: parsed.data.signatureDrawn || null,
  })
  if (sigError) return { error: sigError.message }

  await admin
    .from('signing_links')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', link.id)

  const { data: signatures } = await admin
    .from('signatures')
    .select('signer_role')
    .eq('packet_form_id', link.packet_form_id)

  const validation = validateRequiredSignatures(signatures ?? [])
  if (validation.isValid) {
    await admin.from('packet_forms').update({ status: 'completed' }).eq('id', link.packet_form_id)
    await storeCompletedFormDocument(link.packet_form_id).catch(() => null)
    await autoGenerateClaim(link.packet_form_id).catch(() => null)
  }

  revalidatePath(`/sign/${parsed.data.token}`)
  return { error: null, success: validation.isValid ? 'Signature complete. Document is valid.' : `Signature saved. Still missing ${validation.missing.join(' and ')}.` }
}

export async function resendSigningLink(linkId: string): Promise<ActionState> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }
  if (!['staff', 'program_manager', 'org_admin', 'super_admin'].includes(user.role)) return { error: 'Unauthorized' }

  const admin = createAdminClient()
  const { data: link, error } = await admin
    .from('signing_links')
    .select('token, signer_name, signer_email, signer_role, completed_at, expires_at, is_revoked, organization_id, packet_form_id, packet_forms(form_templates(name)), organizations(name)')
    .eq('id', linkId)
    .eq('organization_id', user.organizationId)
    .single()

  if (error || !link) return { error: 'Signing link not found' }
  if (link.is_revoked) return { error: 'Signing link has been revoked' }
  if (link.completed_at) return { error: 'Signing link has already been completed' }
  if (new Date(link.expires_at as string) < new Date()) return { error: 'Signing link has expired' }

  const signerEmail = link.signer_email
  if (signerEmail) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pf = link.packet_forms as any
      const ft = pf?.form_templates
      const templateName = (Array.isArray(ft) ? ft[0] : ft)?.name ?? 'Document'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const org = link.organizations as any
      const orgName = (Array.isArray(org) ? org[0] : org)?.name ?? 'Your Organization'

      const emailHtml = signingLinkEmail({
        orgName,
        documentName: templateName,
        signerName: link.signer_name,
        signingLink: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/sign/${link.token}`,
        senderName: user.fullName,
      })

      const resendKey = process.env.RESEND_API_KEY
      if (resendKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Higsi <notifications@higsi.app>',
            to: [signerEmail],
            subject: `Sign: ${templateName} - ${orgName}`,
            html: emailHtml,
          }),
        })
      }
    } catch {
      // email delivery failure is non-fatal
    }
  }

  return { error: null, success: 'Signing link resent.', link: `/sign/${link.token}` }
}

export async function revokeSigningLink(linkId: string): Promise<ActionState> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }
  if (!['staff', 'program_manager', 'org_admin', 'super_admin'].includes(user.role)) return { error: 'Unauthorized' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('signing_links')
    .update({ is_revoked: true })
    .eq('id', linkId)
    .eq('organization_id', user.organizationId)

  if (error) return { error: error.message }
  return { error: null, success: 'Signing link has been revoked.' }
}

export async function getSigningLinkStatus(token: string): Promise<{ error: string | null; data?: SigningLinkStatus }> {
  const admin = createAdminClient()
  const { data: link, error } = await admin
    .from('signing_links')
    .select('expires_at, completed_at, is_revoked, created_at')
    .eq('token', token)
    .single()

  if (error || !link) return { error: 'Signing link not found' }

  let status: SigningLinkStatus['status'] = 'pending'
  if (link.is_revoked) status = 'revoked'
  else if (link.completed_at) status = 'completed'
  else if (link.expires_at && new Date(link.expires_at) < new Date()) status = 'expired'

  return {
    error: null,
    data: {
      status,
      expiresAt: link.expires_at,
      completedAt: link.completed_at,
      createdAt: link.created_at,
    },
  }
}
