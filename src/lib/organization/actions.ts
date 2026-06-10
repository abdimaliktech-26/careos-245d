'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession } from '@/lib/auth/get-session'
import { createClient as createServerClient } from '@/lib/supabase/server'

const organizationSettingsSchema = z.object({
  name: z.string().min(1, 'Business name required').max(200),
  licenseNumber: z.string().max(100).optional(),
  ein: z.string().max(20).optional(),
  npi: z.string().max(20).optional(),
  medicaidId: z.string().max(50).optional(),
  medicareId: z.string().max(50).optional(),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(30).optional(),
  zip: z.string().max(20).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  timezone: z.string().max(50).optional(),
  defaultHourlyRate: z.string().optional(),
  logoUrl: z.string().url('Invalid logo URL').optional().or(z.literal('')),
  slackWebhookUrl: z.string().url('Invalid Slack webhook URL').optional().or(z.literal('')),
  teamsWebhookUrl: z.string().url('Invalid Teams webhook URL').optional().or(z.literal('')),
  brandPrimary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  brandAccent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
})

type ActionResult = { error: string | null; success?: boolean }

export async function updateOrganizationSettings(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = organizationSettingsSchema.safeParse({
    name: formData.get('name'),
    licenseNumber: formData.get('licenseNumber') || undefined,
    ein: formData.get('ein') || undefined,
    npi: formData.get('npi') || undefined,
    medicaidId: formData.get('medicaidId') || undefined,
    medicareId: formData.get('medicareId') || undefined,
    address: formData.get('address') || undefined,
    city: formData.get('city') || undefined,
    state: formData.get('state') || undefined,
    zip: formData.get('zip') || undefined,
    phone: formData.get('phone') || undefined,
    email: formData.get('email') || undefined,
    website: formData.get('website') || undefined,
    timezone: formData.get('timezone') || undefined,
    defaultHourlyRate: formData.get('defaultHourlyRate') || undefined,
    logoUrl: formData.get('logoUrl') || undefined,
    slackWebhookUrl: formData.get('slackWebhookUrl') || undefined,
    teamsWebhookUrl: formData.get('teamsWebhookUrl') || undefined,
    brandPrimary: formData.get('brandPrimary') || undefined,
    brandAccent: formData.get('brandAccent') || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId || !['org_admin', 'super_admin'].includes(user.role)) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('organizations')
    .update({
      name: parsed.data.name,
      license_number: parsed.data.licenseNumber || null,
      ein: parsed.data.ein || null,
      npi: parsed.data.npi || null,
      medicaid_id: parsed.data.medicaidId || null,
      medicare_id: parsed.data.medicareId || null,
      address: parsed.data.address || null,
      city: parsed.data.city || null,
      state: parsed.data.state || 'MN',
      zip: parsed.data.zip || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      website: parsed.data.website || null,
      timezone: parsed.data.timezone || 'America/Chicago',
      default_hourly_rate: parsed.data.defaultHourlyRate ? parseFloat(parsed.data.defaultHourlyRate) : null,
      logo_url: parsed.data.logoUrl || null,
      brand_primary: parsed.data.brandPrimary || null,
      brand_accent: parsed.data.brandAccent || null,
      slack_webhook_url: parsed.data.slackWebhookUrl || null,
      teams_webhook_url: parsed.data.teamsWebhookUrl || null,
    })
    .eq('id', user.organizationId)

  if (error) return { error: error.message }

  revalidatePath('/admin/settings')
  revalidatePath('/clients')
  return { error: null, success: true }
}
