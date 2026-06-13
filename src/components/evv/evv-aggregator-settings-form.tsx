'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveAggregatorConfig } from '@/lib/evv/aggregator/actions'

type Vendor = 'none' | 'hhaexchange' | 'sandata'

type EvvAggregatorSettingsFormProps = {
  initial: {
    vendor: Vendor
    providerId: string
    apiBase: string
    credentialRef: string
    enabled: boolean
  }
}

const VENDOR_OPTIONS: Array<{ value: Vendor; label: string }> = [
  { value: 'none', label: 'None (not transmitting)' },
  { value: 'hhaexchange', label: 'HHAeXchange (Minnesota)' },
  { value: 'sandata', label: 'Sandata' },
]

export function EvvAggregatorSettingsForm({ initial }: EvvAggregatorSettingsFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [vendor, setVendor] = useState<Vendor>(initial.vendor)
  const [providerId, setProviderId] = useState(initial.providerId)
  const [apiBase, setApiBase] = useState(initial.apiBase)
  const [credentialRef, setCredentialRef] = useState(initial.credentialRef)
  const [enabled, setEnabled] = useState(initial.enabled)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await saveAggregatorConfig({ vendor, providerId, apiBase, credentialRef, enabled })
      if (result.error) setError(result.error)
      else {
        setSuccess(result.success ?? 'Saved.')
        router.refresh()
      }
    })
  }

  const disabledVendor = vendor === 'none'

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6">
      <div>
        <label className="block text-[13px] font-semibold text-foreground">State EVV aggregator</label>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          The system that receives verified visits for Medicaid billing.
        </p>
        <select
          value={vendor}
          onChange={(e) => setVendor(e.target.value as Vendor)}
          className="care-input mt-2 w-full rounded-xl border px-3 py-2 text-sm"
        >
          {VENDOR_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[13px] font-semibold text-foreground">Provider ID</label>
        <p className="mt-0.5 text-[12px] text-muted-foreground">Your provider ID assigned by the aggregator.</p>
        <input
          value={providerId}
          onChange={(e) => setProviderId(e.target.value)}
          disabled={disabledVendor}
          className="care-input mt-2 w-full rounded-xl border px-3 py-2 text-sm disabled:opacity-50"
          placeholder="e.g. PRV-123456"
        />
      </div>

      <div>
        <label className="block text-[13px] font-semibold text-foreground">API base URL</label>
        <p className="mt-0.5 text-[12px] text-muted-foreground">From the aggregator&apos;s integration packet.</p>
        <input
          value={apiBase}
          onChange={(e) => setApiBase(e.target.value)}
          disabled={disabledVendor}
          className="care-input mt-2 w-full rounded-xl border px-3 py-2 text-sm disabled:opacity-50"
          placeholder="https://api.hhaexchange.com"
        />
      </div>

      <div>
        <label className="block text-[13px] font-semibold text-foreground">Credential reference</label>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          The <strong>name</strong> of the environment secret holding the API key — never the key itself.
          The secret value lives in the server secret store, not the database.
        </p>
        <input
          value={credentialRef}
          onChange={(e) => setCredentialRef(e.target.value.toUpperCase())}
          disabled={disabledVendor}
          className="care-input mt-2 w-full rounded-xl border px-3 py-2 font-mono text-sm disabled:opacity-50"
          placeholder="HHAEXCHANGE_API_KEY"
        />
      </div>

      <label className="flex items-center gap-2.5">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          disabled={disabledVendor}
        />
        <span className="text-[13px] font-semibold text-foreground">
          Enabled — transmit approved visits to the aggregator
        </span>
      </label>

      {error && <p className="text-[12px] text-status-error">{error}</p>}
      {success && <p className="text-[12px] text-emerald-600">{success}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {isPending ? 'Saving…' : 'Save aggregator settings'}
      </button>
    </form>
  )
}
