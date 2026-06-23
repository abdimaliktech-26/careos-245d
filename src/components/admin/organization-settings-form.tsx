'use client'

import { useActionState } from 'react'
import Image from 'next/image'
import { updateOrganizationSettings } from '@/lib/organization/actions'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'

type OrganizationSettingsFormProps = {
  organization: {
    name: string
    license_number: string | null
    ein: string | null
    npi: string | null
    medicaid_id: string | null
    medicare_id: string | null
    address: string | null
    city: string | null
    state: string | null
    zip: string | null
    phone: string | null
    email: string | null
    website: string | null
    timezone: string | null
    default_hourly_rate: number | null
    logo_url: string | null
    slack_webhook_url: string | null
    teams_webhook_url: string | null
    brand_primary: string | null
    brand_accent: string | null
  }
}

const initialState = { error: null, success: false }

export function OrganizationSettingsForm({ organization }: OrganizationSettingsFormProps) {
  const [state, action, isPending] = useActionState(updateOrganizationSettings, initialState)

  return (
    <form action={action} className="bg-card rounded-xl border border-border p-6 space-y-6">
      {state.error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
          Settings saved.
        </p>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Business Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <FormField label="Business Name" name="name" required defaultValue={organization.name} />
          </div>
          <FormField label="License Number" name="licenseNumber" defaultValue={organization.license_number ?? ''} />
          <FormField label="EIN / Tax ID" name="ein" placeholder="XX-XXXXXXX" defaultValue={organization.ein ?? ''} />
          <FormField label="NPI" name="npi" placeholder="10-digit NPI" defaultValue={organization.npi ?? ''} />
          <FormField label="Medicaid ID" name="medicaidId" defaultValue={organization.medicaid_id ?? ''} />
          <FormField label="Medicare ID" name="medicareId" defaultValue={organization.medicare_id ?? ''} />
          <FormField label="Phone" name="phone" defaultValue={organization.phone ?? ''} />
          <FormField label="Email" name="email" type="email" defaultValue={organization.email ?? ''} />
          <FormField label="Website" name="website" type="url" defaultValue={organization.website ?? ''} placeholder="https://example.com" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Address</h2>
        <FormField label="Street Address" name="address" defaultValue={organization.address ?? ''} />
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-2">
            <FormField label="City" name="city" defaultValue={organization.city ?? ''} />
          </div>
          <FormField label="State" name="state" defaultValue={organization.state ?? 'MN'} />
          <FormField label="ZIP" name="zip" defaultValue={organization.zip ?? ''} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Regional & Rates</h2>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Timezone" name="timezone" defaultValue={organization.timezone ?? 'America/Chicago'} list="timezone-options" />
          <FormField label="Default Hourly Rate ($)" name="defaultHourlyRate" type="number" step="0.01" defaultValue={organization.default_hourly_rate?.toString() ?? ''} />
        </div>
        <datalist id="timezone-options">
          <option value="America/Chicago" />
          <option value="America/New_York" />
          <option value="America/Denver" />
          <option value="America/Los_Angeles" />
          <option value="America/Anchorage" />
          <option value="Pacific/Honolulu" />
        </datalist>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
        <p className="text-xs text-muted-foreground">Receive audit alerts via Slack or Microsoft Teams webhooks.</p>
        <FormField label="Slack Webhook URL" name="slackWebhookUrl" type="url" defaultValue={organization.slack_webhook_url ?? ''} placeholder="https://hooks.slack.com/services/..." />
        <FormField label="Teams Webhook URL" name="teamsWebhookUrl" type="url" defaultValue={organization.teams_webhook_url ?? ''} placeholder="https://yourdomain.webhook.office.com/..." />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Portal & Document Branding</h2>
        <p className="text-xs text-muted-foreground">Customize your organization&apos;s look. These colors and logo appear in the sidebar, documents, and signing pages.</p>
        <FormField label="Logo URL" name="logoUrl" type="url" defaultValue={organization.logo_url ?? ''} placeholder="https://..." />
        {organization.logo_url && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted px-3 py-2">
            <Image src={organization.logo_url} alt="Organization logo preview" width={48} height={48} unoptimized className="h-12 w-12 object-contain bg-card border border-border rounded" />
            <p className="text-xs text-muted-foreground">This logo appears on documents, signing pages, and the sidebar.</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                name="brandPrimary"
                defaultValue={organization.brand_primary ?? '#10B99A'}
                className="h-9 w-9 cursor-pointer rounded border border-border bg-transparent p-0.5"
              />
              <input
                type="text"
                name="brandPrimary"
                defaultValue={organization.brand_primary ?? '#10B99A'}
                className="flex-1 rounded-lg border border-border px-3 py-1.5 text-xs font-mono outline-none focus:border-ring focus:ring-2 focus:ring-ring/15"
                placeholder="#10B99A"
                pattern="^#[0-9A-Fa-f]{6}$"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">Accent Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                name="brandAccent"
                defaultValue={organization.brand_accent ?? '#001F5B'}
                className="h-9 w-9 cursor-pointer rounded border border-border bg-transparent p-0.5"
              />
              <input
                type="text"
                name="brandAccent"
                defaultValue={organization.brand_accent ?? '#001F5B'}
                className="flex-1 rounded-lg border border-border px-3 py-1.5 text-xs font-mono outline-none focus:border-ring focus:ring-2 focus:ring-ring/15"
                placeholder="#001F5B"
                pattern="^#[0-9A-Fa-f]{6}$"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="submit" loading={isPending}>
          Save Settings
        </Button>
      </div>
    </form>
  )
}
