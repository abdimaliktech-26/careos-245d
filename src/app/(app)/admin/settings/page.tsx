import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { OrganizationSettingsForm } from '@/components/admin/organization-settings-form'

export default async function OrganizationSettingsPage() {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')
  if (!user.organizationId || !['org_admin', 'super_admin'].includes(user.role)) redirect('/dashboard')

  const supabase = await createClient()
  const { data: organization } = await supabase
    .from('organizations')
    .select('name, license_number, ein, npi, medicaid_id, medicare_id, address, city, state, zip, phone, email, website, timezone, default_hourly_rate, logo_url, brand_primary, brand_accent, slack_webhook_url, teams_webhook_url')
    .eq('id', user.organizationId)
    .single()

  if (!organization) redirect('/dashboard')

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase mb-2">
          Organization
        </p>
        <h1 className="text-3xl font-bold text-foreground">Business Settings</h1>
        <p className="text-muted-foreground mt-1">
          These details appear on completed form downloads and organization records.
        </p>
      </div>

      <OrganizationSettingsForm organization={organization} />
    </div>
  )
}
