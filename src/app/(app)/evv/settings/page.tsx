import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { EvvAggregatorSettingsForm } from '@/components/evv/evv-aggregator-settings-form'
import { EvvStateSelector } from '@/components/evv/evv-state-selector'
import { listStateProfiles, DEFAULT_STATE } from '@/lib/evv/states/registry'

type Vendor = 'none' | 'hhaexchange' | 'sandata'

export default async function EvvSettingsPage() {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')
  if (!user.organizationId || !['org_admin', 'super_admin'].includes(user.role)) redirect('/evv')

  const supabase = await createClient()
  const { data } = await supabase
    .from('evv_aggregator_config')
    .select('vendor, provider_id, api_base, credential_ref, enabled')
    .eq('organization_id', user.organizationId)
    .maybeSingle()

  const row = data as {
    vendor: Vendor
    provider_id: string | null
    api_base: string | null
    credential_ref: string | null
    enabled: boolean
  } | null

  const initial = {
    vendor: row?.vendor ?? ('none' as Vendor),
    providerId: row?.provider_id ?? '',
    apiBase: row?.api_base ?? '',
    credentialRef: row?.credential_ref ?? '',
    enabled: row?.enabled ?? false,
  }

  const { data: stateRow } = await supabase
    .from('evv_state_config')
    .select('state_code')
    .eq('organization_id', user.organizationId)
    .maybeSingle()
  const currentState = (stateRow as { state_code: string } | null)?.state_code ?? DEFAULT_STATE
  const stateOptions = listStateProfiles().map((p) => ({ code: p.code, name: p.name, defaultVendor: p.defaultVendor }))

  return (
    <div className="max-w-2xl">
      <Link href="/evv" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to EVV
      </Link>
      <div className="mt-3 mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          EVV · State Aggregator
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Aggregator Integration</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Connect to the state EVV aggregator so approved visits transmit for Medicaid billing.
          Approved visits queue automatically; the worker sends them on the next run.
        </p>
      </div>

      <EvvStateSelector options={stateOptions} current={currentState} />
      <EvvAggregatorSettingsForm initial={initial} />
    </div>
  )
}
